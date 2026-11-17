package edu.ucsb.cs156.dining.services.wiremock;

import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import edu.ucsb.cs156.dining.models.DiningCommons;
import edu.ucsb.cs156.dining.models.Entree;
import edu.ucsb.cs156.dining.services.DiningCommonsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuItemsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

class DiningApiWiremockServiceTests {

  private static final String DATE = "2026-11-12";

  private AnnotationConfigApplicationContext createContext(String profile) {

    AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();

    context.getEnvironment().setActiveProfiles(profile);

    // Port 0 makes WireMock choose an available port for tests.
    context
        .getEnvironment()
        .getPropertySources()
        .addFirst(
            new MapPropertySource(
                "wiremock-test-properties", Map.of("app.ucsb.wiremock.port", "0")));

    context.register(DiningApiWiremockService.class);
    context.refresh();

    return context;
  }

  private void configureService(Object service, String host) {
    ReflectionTestUtils.setField(service, "apiHost", host);
    ReflectionTestUtils.setField(service, "apiKey", DiningApiWireMockStubs.TEST_API_KEY);
    ReflectionTestUtils.setField(service, "appName", "test-app");
    ReflectionTestUtils.setField(service, "appHostname", "localhost");
  }

  @Test
  void doesNotStartOutsideIntegrationProfile() {
    try (AnnotationConfigApplicationContext context = createContext("development")) {

      assertFalse(context.containsBean("diningApiWiremockService"));
    }
  }

  @Test
  void startsReturnsMockDataAndStopsOnContextClose() throws Exception {

    WireMockServer server;

    try (AnnotationConfigApplicationContext context = createContext("integration")) {

      DiningApiWiremockService service = context.getBean(DiningApiWiremockService.class);

      server = service.getWiremockServer();

      assertTrue(server.isRunning());
      assertTrue(server.port() > 0);

      String host = "http://127.0.0.1:" + server.port();

      // Demonstrate that two independent mock servers can run.
      WireMockServer otherServer = new WireMockServer(options().dynamicPort());

      otherServer.start();

      try {
        assertTrue(otherServer.isRunning());
        assertNotEquals(otherServer.port(), server.port());
      } finally {
        otherServer.stop();
      }

      // Exercise the real Dining Commons service.
      DiningCommonsService commons = new DiningCommonsService(new RestTemplateBuilder());

      configureService(commons, host);

      ReflectionTestUtils.setField(commons, "mapper", new ObjectMapper());

      List<DiningCommons> commonsResult = commons.get();

      assertEquals(1, commonsResult.size());
      assertEquals("portola", commonsResult.get(0).getCode());

      // Exercise the real Dining Menu service.
      UCSBDiningMenuService menus = new UCSBDiningMenuService(new RestTemplateBuilder());

      configureService(menus, host);

      String menuJson = menus.getJSON(DATE, "portola");

      String mealCode = new ObjectMapper().readTree(menuJson).get(0).get("code").asText();

      assertEquals("lunch", mealCode);

      // Exercise the real Dining Menu Items service.
      UCSBDiningMenuItemsService items = new UCSBDiningMenuItemsService(new RestTemplateBuilder());

      configureService(items, host);

      ReflectionTestUtils.setField(items, "objectMapper", new ObjectMapper());

      List<Entree> result = items.get(DATE, "portola", "lunch");

      assertEquals(2, result.size());
      assertEquals("Cheese Pizza", result.get(0).getName());
      assertEquals("Garden Salad", result.get(1).getName());

      // Verify actual requests reached the mock API.
      server.verify(
          1,
          getRequestedFor(urlPathEqualTo("/dining/commons/v1/"))
              .withHeader("ucsb-api-key", equalTo(DiningApiWireMockStubs.TEST_API_KEY)));

      server.verify(1, getRequestedFor(urlPathEqualTo("/dining/menu/v1/" + DATE + "/portola")));

      server.verify(
          1, getRequestedFor(urlPathEqualTo("/dining/menu/v1/" + DATE + "/portola/lunch")));
    }

    // Closing the Spring context should stop WireMock.
    assertFalse(server.isRunning());
  }
}
