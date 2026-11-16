package edu.ucsb.cs156.dining.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.ucsb.cs156.dining.models.DiningCommons;
import edu.ucsb.cs156.dining.models.Entree;
import edu.ucsb.cs156.dining.services.DiningCommonsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuItemsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuService;
import edu.ucsb.cs156.jobs.services.JobContext;
import edu.ucsb.cs156.jobs.services.JobContextConsumer;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.concurrent.Callable;
import lombok.Builder;
import org.springframework.web.client.HttpClientErrorException;

/** Downloads and saves the menu items for every day of a month, backing off on 429s. */
@Builder
public class LoadMonthMenuItemsJob implements JobContextConsumer {

  private DiningCommonsService diningCommonsService;
  private UCSBDiningMenuService menuService;
  private UCSBDiningMenuItemsService menuItemsService;
  private String apiKey;
  private YearMonth month;
  private Sleeper sleeper;
  @Builder.Default private int maxRetries = 5;
  @Builder.Default private long initialBackoffMs = 1000;
  @Builder.Default private ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public void accept(JobContext ctx) throws Exception {
    if (apiKey == null || apiKey.isBlank()) {
      ctx.log("UCSB API key is not set; skipping menu item download.");
      return;
    }

    List<DiningCommons> commonsList = withRetry(ctx, () -> diningCommonsService.get());

    int itemCount = 0;
    for (LocalDate date = month.atDay(1);
        !date.isAfter(month.atEndOfMonth());
        date = date.plusDays(1)) {
      for (DiningCommons commons : commonsList) {
        itemCount += loadDay(ctx, date.toString(), commons.getCode());
      }
    }
    ctx.log(
        "Finished loading menu items for " + month + " (" + itemCount + " menu items processed)");
  }

  private int loadDay(JobContext ctx, String date, String code) throws Exception {
    JsonNode meals;
    try {
      String mealsJson = withRetry(ctx, () -> menuService.getJSON(date, code));
      if (mealsJson == null) {
        return 0; // commons closed that day
      }
      meals = objectMapper.readTree(mealsJson);
    } catch (Exception e) {
      ctx.log("Failed to load meals for " + date + " " + code + ": " + e.getMessage());
      return 0;
    }

    int count = 0;
    for (JsonNode meal : meals) {
      String mealCode = meal.get("code").asText();
      try {
        List<Entree> entrees = withRetry(ctx, () -> menuItemsService.get(date, code, mealCode));
        count += menuItemsService.getOrCreateMenuItems(code, mealCode, entrees).size();
      } catch (Exception e) {
        ctx.log("Failed to load " + date + " " + code + " " + mealCode + ": " + e.getMessage());
      }
    }
    return count;
  }

  private <T> T withRetry(JobContext ctx, Callable<T> call) throws Exception {
    long backoff = initialBackoffMs;
    for (int attempt = 0; ; attempt++) {
      try {
        return call.call();
      } catch (HttpClientErrorException.TooManyRequests e) {
        if (attempt >= maxRetries) {
          throw e;
        }
        ctx.log("Rate limited (429); waiting " + backoff + " ms before retrying");
        sleeper.sleep(backoff);
        backoff *= 2;
      }
    }
  }
}
