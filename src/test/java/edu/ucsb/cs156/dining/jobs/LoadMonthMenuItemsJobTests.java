package edu.ucsb.cs156.dining.jobs;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import edu.ucsb.cs156.dining.entities.MenuItem;
import edu.ucsb.cs156.dining.models.DiningCommons;
import edu.ucsb.cs156.dining.models.Entree;
import edu.ucsb.cs156.dining.services.DiningCommonsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuItemsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuService;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

public class LoadMonthMenuItemsJobTests {

  private static final YearMonth FEB_2027 = YearMonth.of(2027, 2); // 28 days
  private static final String LUNCH_JSON = "[{\"name\":\"Lunch\",\"code\":\"lunch\"}]";
  private static final String LUNCH_AND_DINNER_JSON =
      "[{\"name\":\"Lunch\",\"code\":\"lunch\"},{\"name\":\"Dinner\",\"code\":\"dinner\"}]";

  private DiningCommonsService diningCommonsService;
  private UCSBDiningMenuService menuService;
  private UCSBDiningMenuItemsService menuItemsService;
  private Sleeper sleeper;
  private JobContext ctx;

  private final List<Entree> entrees = List.of(mock(Entree.class));
  private final List<MenuItem> oneItem = List.of(mock(MenuItem.class));

  private final HttpClientErrorException tooManyRequests =
      HttpClientErrorException.create(
          HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", HttpHeaders.EMPTY, null, null);

  @BeforeEach
  public void setup() {
    diningCommonsService = mock(DiningCommonsService.class);
    menuService = mock(UCSBDiningMenuService.class);
    menuItemsService = mock(UCSBDiningMenuItemsService.class);
    sleeper = mock(Sleeper.class);
    ctx = mock(JobContext.class);
  }

  // ---------- helpers ----------

  private LoadMonthMenuItemsJob job(String apiKey) {
    return LoadMonthMenuItemsJob.builder()
        .diningCommonsService(diningCommonsService)
        .menuService(menuService)
        .menuItemsService(menuItemsService)
        .apiKey(apiKey)
        .month(FEB_2027)
        .sleeper(sleeper)
        .build();
  }

  private DiningCommons commons(String code) {
    DiningCommons dc = mock(DiningCommons.class);
    when(dc.getCode()).thenReturn(code);
    return dc;
  }

  /** Portola serves lunch every day; each meal yields one menu item. */
  private void stubPortolaLunchEveryDay() throws Exception {
    DiningCommons portola = commons("portola");
    when(diningCommonsService.get()).thenReturn(List.of(portola));
    when(menuService.getJSON(anyString(), eq("portola"))).thenReturn(LUNCH_JSON);
    when(menuItemsService.get(anyString(), eq("portola"), eq("lunch"))).thenReturn(entrees);
    when(menuItemsService.getOrCreateMenuItems("portola", "lunch", entrees)).thenReturn(oneItem);
  }

  private void verifyRateLimitLogs(long... waits) {
    for (long wait : waits) {
      verify(ctx).log("Rate limited (429); waiting " + wait + " ms before retrying");
    }
  }

  // ---------- API key ----------

  @Test
  public void blank_api_key_makes_no_requests() throws Exception {
    job("").accept(ctx);

    verify(ctx).log("UCSB API key is not set; skipping menu item download.");
    verifyNoMoreInteractions(ctx);
    verifyNoInteractions(diningCommonsService, menuService, menuItemsService, sleeper);
  }

  @Test
  public void whitespace_api_key_makes_no_requests() throws Exception {
    job("   ").accept(ctx);

    verify(ctx).log("UCSB API key is not set; skipping menu item download.");
    verifyNoMoreInteractions(ctx);
    verifyNoInteractions(diningCommonsService, menuService, menuItemsService, sleeper);
  }

  @Test
  public void null_api_key_makes_no_requests() throws Exception {
    job(null).accept(ctx);

    verify(ctx).log("UCSB API key is not set; skipping menu item download.");
    verifyNoMoreInteractions(ctx);
    verifyNoInteractions(diningCommonsService, menuService, menuItemsService, sleeper);
  }

  // ---------- normal operation ----------

  @Test
  public void loads_every_day_of_the_month() throws Exception {
    stubPortolaLunchEveryDay();

    job("test-key").accept(ctx);

    verify(menuService, times(28)).getJSON(anyString(), eq("portola"));
    verify(menuService).getJSON("2027-02-01", "portola"); // first day
    verify(menuService).getJSON("2027-02-28", "portola"); // last day
    verify(menuService, never()).getJSON("2027-01-31", "portola");
    verify(menuService, never()).getJSON("2027-03-01", "portola");

    verify(menuItemsService, times(28)).get(anyString(), eq("portola"), eq("lunch"));
    verify(menuItemsService, times(28)).getOrCreateMenuItems("portola", "lunch", entrees);

    verify(ctx).log("Finished loading menu items for 2027-02 (28 menu items processed)");
    verifyNoMoreInteractions(ctx);
    verifyNoInteractions(sleeper);
  }

  @Test
  public void loads_every_meal_and_skips_closed_commons() throws Exception {
    DiningCommons portola = commons("portola");
    DiningCommons carrillo = commons("carrillo");
    when(diningCommonsService.get()).thenReturn(List.of(portola, carrillo));
    when(menuService.getJSON(anyString(), eq("portola"))).thenReturn(LUNCH_AND_DINNER_JSON);
    when(menuService.getJSON(anyString(), eq("carrillo"))).thenReturn(null); // closed
    when(menuItemsService.get(anyString(), eq("portola"), anyString())).thenReturn(entrees);
    when(menuItemsService.getOrCreateMenuItems(eq("portola"), anyString(), eq(entrees)))
        .thenReturn(oneItem);

    job("test-key").accept(ctx);

    verify(menuItemsService, times(28)).get(anyString(), eq("portola"), eq("lunch"));
    verify(menuItemsService, times(28)).get(anyString(), eq("portola"), eq("dinner"));
    verify(menuService, times(28)).getJSON(anyString(), eq("carrillo"));
    verify(menuItemsService, never()).get(anyString(), eq("carrillo"), anyString());

    verify(ctx).log("Finished loading menu items for 2027-02 (56 menu items processed)");
    verifyNoMoreInteractions(ctx);
  }

  // ---------- 429 backoff ----------

  @Test
  public void retries_meals_after_one_429_then_succeeds() throws Exception {
    stubPortolaLunchEveryDay();
    when(menuService.getJSON("2027-02-01", "portola"))
        .thenThrow(tooManyRequests)
        .thenReturn(LUNCH_JSON);

    job("test-key").accept(ctx);

    verify(sleeper).sleep(1000);
    verifyNoMoreInteractions(sleeper);
    verify(menuService, times(2)).getJSON("2027-02-01", "portola");
    verify(menuItemsService).get("2027-02-01", "portola", "lunch");

    verifyRateLimitLogs(1000);
    verify(ctx).log("Finished loading menu items for 2027-02 (28 menu items processed)");
    verifyNoMoreInteractions(ctx);
  }

  @Test
  public void backoff_doubles_on_repeated_429s() throws Exception {
    stubPortolaLunchEveryDay();
    when(menuItemsService.get("2027-02-01", "portola", "lunch"))
        .thenThrow(tooManyRequests)
        .thenThrow(tooManyRequests)
        .thenReturn(entrees);

    job("test-key").accept(ctx);

    InOrder order = inOrder(sleeper);
    order.verify(sleeper).sleep(1000);
    order.verify(sleeper).sleep(2000);
    verifyNoMoreInteractions(sleeper);
    verify(menuItemsService, times(3)).get("2027-02-01", "portola", "lunch");

    verifyRateLimitLogs(1000, 2000);
    verify(ctx).log("Finished loading menu items for 2027-02 (28 menu items processed)");
    verifyNoMoreInteractions(ctx);
  }

  @Test
  public void gives_up_on_commons_list_after_max_retries() throws Exception {
    when(diningCommonsService.get()).thenThrow(tooManyRequests);

    assertThrows(HttpClientErrorException.TooManyRequests.class, () -> job("test-key").accept(ctx));

    InOrder order = inOrder(sleeper);
    order.verify(sleeper).sleep(1000);
    order.verify(sleeper).sleep(2000);
    order.verify(sleeper).sleep(4000);
    order.verify(sleeper).sleep(8000);
    order.verify(sleeper).sleep(16000);
    verifyNoMoreInteractions(sleeper);
    verify(diningCommonsService, times(6)).get(); // 1 try + 5 retries
    verifyNoInteractions(menuService, menuItemsService);

    verifyRateLimitLogs(1000, 2000, 4000, 8000, 16000);
    verifyNoMoreInteractions(ctx);
  }

  @Test
  public void persistent_429_on_meals_skips_only_that_day() throws Exception {
    stubPortolaLunchEveryDay();
    when(menuService.getJSON("2027-02-01", "portola")).thenThrow(tooManyRequests);

    job("test-key").accept(ctx);

    verify(menuService, times(6)).getJSON("2027-02-01", "portola");
    verify(menuItemsService, never()).get(eq("2027-02-01"), anyString(), anyString());
    verify(menuItemsService).get("2027-02-02", "portola", "lunch"); // next day still loads

    verifyRateLimitLogs(1000, 2000, 4000, 8000, 16000);
    verify(ctx).log(startsWith("Failed to load meals for 2027-02-01 portola: "));
    verify(ctx).log("Finished loading menu items for 2027-02 (27 menu items processed)");
    verifyNoMoreInteractions(ctx);
  }

  // ---------- other failures ----------

  @Test
  public void error_loading_items_is_logged_and_other_days_continue() throws Exception {
    stubPortolaLunchEveryDay();
    when(menuItemsService.get("2027-02-10", "portola", "lunch"))
        .thenThrow(new RuntimeException("boom"));

    job("test-key").accept(ctx);

    verify(menuItemsService).get("2027-02-11", "portola", "lunch");
    verify(ctx).log("Failed to load 2027-02-10 portola lunch: boom");
    verify(ctx).log("Finished loading menu items for 2027-02 (27 menu items processed)");
    verifyNoMoreInteractions(ctx);
    verifyNoInteractions(sleeper);
  }

  @Test
  public void invalid_meals_json_is_logged_and_skipped() throws Exception {
    stubPortolaLunchEveryDay();
    when(menuService.getJSON("2027-02-05", "portola")).thenReturn("not json");

    job("test-key").accept(ctx);

    verify(menuItemsService, never()).get(eq("2027-02-05"), anyString(), anyString());
    verify(ctx).log(startsWith("Failed to load meals for 2027-02-05 portola: "));
    verify(ctx).log("Finished loading menu items for 2027-02 (27 menu items processed)");
    verifyNoMoreInteractions(ctx);
  }
}
