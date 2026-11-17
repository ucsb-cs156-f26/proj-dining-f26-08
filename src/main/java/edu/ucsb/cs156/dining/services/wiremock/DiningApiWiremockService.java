package edu.ucsb.cs156.dining.services.wiremock;

import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Slf4j
@Service("diningApiWiremockService")
@Profile("integration")
public class DiningApiWiremockService {

  @Value("${app.ucsb.wiremock.port:8091}")
  private int port;

  private WireMockServer wireMockServer;

  /** Starts the fake Dining API during integration testing. */
  @PostConstruct
  public void init() {
    WireMockConfiguration config = options().bindAddress("127.0.0.1");

    if (port == 0) {
      config.dynamicPort();
    } else {
      config.port(port);
    }

    wireMockServer = new WireMockServer(config);

    try {
      wireMockServer.start();
      DiningApiWireMockStubs.install(wireMockServer);

      log.info("Dining API WireMock started on port {}", wireMockServer.port());

    } catch (RuntimeException e) {
      wireMockServer.stop();
      throw e;
    }
  }

  /** Stops the fake API when Spring shuts down. */
  @PreDestroy
  public void stop() {
    if (wireMockServer != null) {
      wireMockServer.stop();
    }
  }

  public WireMockServer getWiremockServer() {
    return wireMockServer;
  }
}
