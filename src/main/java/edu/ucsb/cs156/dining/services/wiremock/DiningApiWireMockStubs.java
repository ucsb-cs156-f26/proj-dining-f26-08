package edu.ucsb.cs156.dining.services.wiremock;

import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathMatching;

import com.github.tomakehurst.wiremock.WireMockServer;

/** Reusable fake UCSB Dining API responses. */
public final class DiningApiWireMockStubs {

  public static final String TEST_API_KEY = "wiremock-test-key";

  public static final String COMMONS_JSON =
      """
      [
        {
          "name": "Portola",
          "code": "portola",
          "hasDiningCam": false,
          "hasSackMeal": false,
          "hasTakeOutMeal": false,
          "location": {
            "longitude": -119.853,
            "latitude": 34.422
          }
        }
      ]
      """;

  public static final String MEALS_JSON =
      """
      [
        {
          "code": "lunch",
          "name": "Lunch"
        }
      ]
      """;

  public static final String ITEMS_JSON =
      """
      [
        {
          "name": "Cheese Pizza",
          "station": "Pizza"
        },
        {
          "name": "Garden Salad",
          "station": "Salad Bar"
        }
      ]
      """;

  private DiningApiWireMockStubs() {}

  /** Adds the Dining API endpoints needed by review tests. */
  public static void install(WireMockServer server) {

    server.stubFor(
        get(urlPathEqualTo("/dining/commons/v1/"))
            .withHeader("ucsb-api-key", equalTo(TEST_API_KEY))
            .willReturn(okJson(COMMONS_JSON)));

    server.stubFor(
        get(urlPathMatching("/dining/menu/v1/[^/]+/[^/]+/[^/]+"))
            .withHeader("ucsb-api-key", equalTo(TEST_API_KEY))
            .willReturn(okJson(ITEMS_JSON)));

    server.stubFor(
        get(urlPathMatching("/dining/menu/v1/[^/]+/[^/]+"))
            .withHeader("ucsb-api-key", equalTo(TEST_API_KEY))
            .willReturn(okJson(MEALS_JSON)));
  }
}
