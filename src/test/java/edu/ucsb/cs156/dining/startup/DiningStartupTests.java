package edu.ucsb.cs156.dining.startup;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import edu.ucsb.cs156.dining.entities.Admin;
import edu.ucsb.cs156.dining.jobs.LoadMonthMenuItemsJob;
import edu.ucsb.cs156.dining.repositories.AdminRepository;
import edu.ucsb.cs156.dining.services.DiningCommonsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuItemsService;
import edu.ucsb.cs156.dining.services.UCSBDiningMenuService;
import edu.ucsb.cs156.jobs.services.JobService;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;

class DiningStartupTests {

  @Mock private AdminRepository adminRepository;
  @Mock private JobService jobService;
  @Mock private DiningCommonsService diningCommonsService;
  @Mock private UCSBDiningMenuService menuService;
  @Mock private UCSBDiningMenuItemsService menuItemsService;
  private DiningStartup diningStartup;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    diningStartup = new DiningStartup();
    diningStartup.adminRepository = adminRepository;
    diningStartup.adminEmails = List.of("admin1@ucsb.edu", "admin2@ucsb.edu");
    diningStartup.jobService = jobService;
    diningStartup.diningCommonsService = diningCommonsService;
    diningStartup.menuService = menuService;
    diningStartup.menuItemsService = menuItemsService;
    diningStartup.apiKey = "test-key";
    diningStartup.loadMonthMenuItems = true;
  }

  @Test
  void test_AlwaysRunOnStartup_saves_admins() {
    when(adminRepository.existsByEmail(anyString())).thenReturn(false);

    diningStartup.alwaysRunOnStartup();

    verify(adminRepository).save(new Admin("admin1@ucsb.edu"));
    verify(adminRepository).save(new Admin("admin2@ucsb.edu"));
  }

  @Test
  void test_AlwaysRunOnStartup_skips_existing_admins() {
    when(adminRepository.existsByEmail("admin1@ucsb.edu")).thenReturn(true);
    when(adminRepository.existsByEmail("admin2@ucsb.edu")).thenReturn(false);

    diningStartup.alwaysRunOnStartup();

    verify(adminRepository, never()).save(new Admin("admin1@ucsb.edu"));
    verify(adminRepository).save(new Admin("admin2@ucsb.edu"));
  }

  @Test
  void test_AlwaysRunOnStartup_handles_exception() {
    when(adminRepository.existsByEmail(anyString())).thenReturn(false);
    doThrow(new RuntimeException("Simulated error")).when(adminRepository).save(any(Admin.class));

    diningStartup.alwaysRunOnStartup();

    // Both emails are attempted despite the exception on the first one
    verify(adminRepository, times(2)).save(any(Admin.class));
  }

  @Test
  void test_AlwaysRunOnStartup_launches_menu_item_job() {
    YearMonth before = YearMonth.now();

    diningStartup.alwaysRunOnStartup();

    YearMonth after = YearMonth.now();
    ArgumentCaptor<LoadMonthMenuItemsJob> captor =
        ArgumentCaptor.forClass(LoadMonthMenuItemsJob.class);
    verify(jobService).runAsJob(captor.capture());

    LoadMonthMenuItemsJob job = captor.getValue();
    assertSame(diningCommonsService, job.getDiningCommonsService());
    assertSame(menuService, job.getMenuService());
    assertSame(menuItemsService, job.getMenuItemsService());
    assertEquals("test-key", job.getApiKey());
    // "before or after" guards against the test running exactly at midnight on a month boundary
    assertEquals(true, job.getMonth().equals(before) || job.getMonth().equals(after));
    assertNotNull(job.getSleeper());
  }

  @Test
  void test_AlwaysRunOnStartup_job_sleeper_actually_sleeps() throws Exception {
    diningStartup.alwaysRunOnStartup();

    ArgumentCaptor<LoadMonthMenuItemsJob> captor =
        ArgumentCaptor.forClass(LoadMonthMenuItemsJob.class);
    verify(jobService).runAsJob(captor.capture());

    long start = System.nanoTime();
    captor.getValue().getSleeper().sleep(50);
    long elapsedMs = (System.nanoTime() - start) / 1_000_000;
    assertEquals(true, elapsedMs >= 45, "slept only " + elapsedMs + " ms");
  }

  @Test
  void test_AlwaysRunOnStartup_handles_job_launch_failure() {
    when(adminRepository.existsByEmail(anyString())).thenReturn(false);
    when(jobService.runAsJob(any())).thenThrow(new RuntimeException("Simulated job error"));

    assertDoesNotThrow(() -> diningStartup.alwaysRunOnStartup());

    // admins are still loaded even though the job failed to start
    verify(adminRepository, times(2)).save(any(Admin.class));
  }

  @Test
  void test_AlwaysRunOnStartup_skips_job_when_disabled() {
    diningStartup.loadMonthMenuItems = false;
    when(adminRepository.existsByEmail(anyString())).thenReturn(false);

    diningStartup.alwaysRunOnStartup();

    verifyNoInteractions(jobService);
    // admins are still loaded when the job is disabled
    verify(adminRepository, times(2)).save(any(Admin.class));
  }
}
