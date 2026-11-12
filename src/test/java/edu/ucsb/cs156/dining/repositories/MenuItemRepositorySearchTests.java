package edu.ucsb.cs156.dining.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs156.dining.entities.MenuItem;
import edu.ucsb.cs156.dining.services.wiremock.WiremockService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@DataJpaTest
public class MenuItemRepositorySearchTests {

  @Autowired private MenuItemRepository menuItemRepository;

  @MockitoBean private WiremockService wiremockService;

  @Test
  public void search_matches_partial_names_ignoring_case() {
    menuItemRepository.save(menuItem("portola", "lunch", "Cheese Pizza"));
    menuItemRepository.save(menuItem("carrillo", "dinner", "PIZZA with mushrooms"));
    menuItemRepository.save(menuItem("de-la-guerra", "lunch", "Grilled Cheese"));

    List<MenuItem> matches =
        menuItemRepository.findTop20ByNameContainingIgnoreCaseOrderByNameAscIdAsc("iZz");

    assertEquals(2, matches.size());
    assertTrue(matches.stream().anyMatch(item -> item.getName().equals("Cheese Pizza")));
    assertTrue(matches.stream().anyMatch(item -> item.getName().equals("PIZZA with mushrooms")));
    assertTrue(
        menuItemRepository
            .findTop20ByNameContainingIgnoreCaseOrderByNameAscIdAsc("unicorn")
            .isEmpty());
  }

  @Test
  public void search_returns_no_more_than_twenty_items() {
    for (int i = 0; i < 25; i++) {
      menuItemRepository.save(menuItem("portola", "lunch", "Pizza %02d".formatted(i)));
    }

    List<MenuItem> matches =
        menuItemRepository.findTop20ByNameContainingIgnoreCaseOrderByNameAscIdAsc("pizza");

    assertEquals(20, matches.size());
    assertEquals("Pizza 00", matches.getFirst().getName());
    assertEquals("Pizza 19", matches.getLast().getName());
  }

  private MenuItem menuItem(String commons, String meal, String name) {
    return MenuItem.builder()
        .diningCommonsCode(commons)
        .mealCode(meal)
        .name(name)
        .station("Main")
        .build();
  }
}
