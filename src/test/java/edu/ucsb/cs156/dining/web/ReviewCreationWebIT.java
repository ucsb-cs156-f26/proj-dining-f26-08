package edu.ucsb.cs156.dining.web;

import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Response;
import com.microsoft.playwright.options.AriaRole;
import edu.ucsb.cs156.dining.WebTestCase;
import edu.ucsb.cs156.dining.entities.Review;
import edu.ucsb.cs156.dining.repositories.ReviewRepository;
import edu.ucsb.cs156.dining.services.wiremock.DiningApiWireMockStubs;
import edu.ucsb.cs156.dining.services.wiremock.DiningApiWiremockService;
import edu.ucsb.cs156.dining.statuses.ModerationStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public class ReviewCreationWebIT extends WebTestCase {

  private static final String DATE = "2026-11-12";
  private static final String DATE_SERVED = "2026-11-12T12:00";
  private static final String COMMENTS = "Issue 29 E2E test review";

  @LocalServerPort private int port;

  @Autowired private ReviewRepository reviewRepository;

  @Autowired private DiningApiWiremockService diningWiremockService;

  @Value("${app.ucsb.api.host}")
  private String apiHost;

  @Value("${app.ucsb.api.consumer_key}")
  private String apiKey;

  @Test
  public void user_can_create_review_with_mocked_dining_api() throws Exception {

    // Verify that the Dining API is configured to use WireMock.
    WireMockServer diningMock = diningWiremockService.getWiremockServer();

    assertTrue(diningMock.isRunning());
    assertEquals("http://127.0.0.1:" + diningMock.port(), apiHost);
    assertEquals(DiningApiWireMockStubs.TEST_API_KEY, apiKey);

    // Clear requests before beginning the browser workflow.
    diningMock.resetRequests();

    // Log in using OAuth WireMock.
    setupUser(false);

    assertThat(page.getByText("Welcome, cgaucho@ucsb.edu")).isVisible();

    // Open the Dining Commons home page.
    page.navigate("http://localhost:" + port + "/");

    // Choose a deterministic date.
    page.locator("#dateSelector").fill(DATE);

    // Navigate to Portola.
    page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("portola")).click();

    // Choose Lunch from the mocked meal response.
    page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Lunch")).click();

    // Find Cheese Pizza from the mocked menu-item response.
    Locator pizzaRow =
        page.getByRole(AriaRole.ROW).filter(new Locator.FilterOptions().setHasText("Cheese Pizza"));

    assertThat(pizzaRow).isVisible();

    // Open the review form for Cheese Pizza.
    pizzaRow
        .getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Review Item"))
        .click();

    // Verify that the correct menu item was selected.
    assertThat(page.locator("#review-item-name")).hasValue("Cheese Pizza");

    // Fill out the actual React review form.
    page.locator("#review-comments").fill(COMMENTS);
    page.locator("#review-stars").selectOption("4");
    page.locator("#review-date").fill(DATE_SERVED);

    // Submit through the UI, not directly through the controller.
    Response response =
        page.waitForResponse(
            r -> r.url().contains("/api/reviews/post") && r.request().method().equals("POST"),
            () ->
                page.getByRole(
                        AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Submit Review"))
                    .click());

    assertEquals(200, response.status());

    // Retrieve the ID of the review created through the UI.
    ObjectMapper mapper = new ObjectMapper();

    long reviewId = mapper.readTree(response.text()).get("id").asLong();

    try {
      // Verify the review actually exists in the database.
      Review savedReview = reviewRepository.findById(reviewId).orElseThrow();

      assertEquals(COMMENTS, savedReview.getReviewerComments());
      assertEquals(4L, savedReview.getItemsStars());
      assertEquals(LocalDateTime.parse(DATE_SERVED), savedReview.getDateItemServed());

      assertEquals(ModerationStatus.AWAITING_REVIEW, savedReview.getStatus());

      // Verify the review belongs to the correct menu item.
      assertEquals("Cheese Pizza", savedReview.getItem().getName());
      assertEquals("portola", savedReview.getItem().getDiningCommonsCode());
      assertEquals("lunch", savedReview.getItem().getMealCode());

      // Verify the authenticated user owns the review.
      assertEquals("cgaucho@ucsb.edu", savedReview.getReviewer().getEmail());

      // Verify requests actually reached Dining WireMock.
      assertFalse(
          diningMock.findAll(getRequestedFor(urlPathEqualTo("/dining/commons/v1/"))).isEmpty());

      assertFalse(
          diningMock
              .findAll(getRequestedFor(urlPathEqualTo("/dining/menu/v1/" + DATE + "/portola")))
              .isEmpty());

      assertFalse(
          diningMock
              .findAll(
                  getRequestedFor(urlPathEqualTo("/dining/menu/v1/" + DATE + "/portola/lunch")))
              .isEmpty());

    } finally {
      // Clean up only the review created by this test.
      reviewRepository.deleteById(reviewId);
    }

    assertFalse(reviewRepository.existsById(reviewId));
  }
}
