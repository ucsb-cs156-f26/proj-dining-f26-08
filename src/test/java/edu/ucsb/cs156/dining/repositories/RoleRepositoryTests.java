package edu.ucsb.cs156.dining.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs156.dining.entities.Admin;
import edu.ucsb.cs156.dining.entities.Moderator;
import edu.ucsb.cs156.dining.services.wiremock.WiremockService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;

@DataJpaTest
public class RoleRepositoryTests {

  @Autowired AdminRepository adminRepository;

  @Autowired ModeratorRepository moderatorRepository;

  @MockBean WiremockService wiremockService;

  @Test
  public void admin_can_be_saved_found_and_deleted_by_email() {
    Admin admin = new Admin("admin@example.org");
    adminRepository.save(admin);

    assertEquals(Optional.of(admin), adminRepository.findById(admin.getEmail()));
    assertEquals(Optional.of(admin), adminRepository.findByEmail(admin.getEmail()));
    assertTrue(adminRepository.existsByEmail(admin.getEmail()));

    adminRepository.deleteById(admin.getEmail());

    assertTrue(adminRepository.findById(admin.getEmail()).isEmpty());
    assertTrue(adminRepository.findByEmail(admin.getEmail()).isEmpty());
    assertFalse(adminRepository.existsByEmail(admin.getEmail()));
  }

  @Test
  public void moderator_can_be_saved_found_and_deleted_by_email() {
    Moderator moderator = new Moderator("moderator@example.org");
    moderatorRepository.save(moderator);

    assertEquals(Optional.of(moderator), moderatorRepository.findById(moderator.getEmail()));
    assertEquals(Optional.of(moderator), moderatorRepository.findByEmail(moderator.getEmail()));
    assertTrue(moderatorRepository.existsByEmail(moderator.getEmail()));

    moderatorRepository.deleteById(moderator.getEmail());

    assertTrue(moderatorRepository.findById(moderator.getEmail()).isEmpty());
    assertTrue(moderatorRepository.findByEmail(moderator.getEmail()).isEmpty());
    assertFalse(moderatorRepository.existsByEmail(moderator.getEmail()));
  }

  @Test
  public void saving_an_admin_email_twice_creates_one_role_entry() {
    adminRepository.save(new Admin("duplicate-admin@example.org"));
    adminRepository.save(new Admin("duplicate-admin@example.org"));

    assertEquals(1, adminRepository.count());
    assertEquals(
        Optional.of(new Admin("duplicate-admin@example.org")),
        adminRepository.findByEmail("duplicate-admin@example.org"));
  }

  @Test
  public void saving_a_moderator_email_twice_creates_one_role_entry() {
    moderatorRepository.save(new Moderator("duplicate-moderator@example.org"));
    moderatorRepository.save(new Moderator("duplicate-moderator@example.org"));

    assertEquals(1, moderatorRepository.count());
    assertEquals(
        Optional.of(new Moderator("duplicate-moderator@example.org")),
        moderatorRepository.findByEmail("duplicate-moderator@example.org"));
  }

  @Test
  public void an_email_can_have_both_roles_independently() {
    String email = "both-roles@example.org";
    adminRepository.save(new Admin(email));
    moderatorRepository.save(new Moderator(email));

    adminRepository.deleteById(email);

    assertFalse(adminRepository.existsByEmail(email));
    assertTrue(moderatorRepository.existsByEmail(email));
  }

  @Test
  public void delete_removes_only_the_matching_admin() {
    Admin admin = adminRepository.save(new Admin("admin@example.org"));
    adminRepository.save(new Admin("other-admin@example.org"));

    adminRepository.delete(admin);

    assertFalse(adminRepository.existsByEmail("admin@example.org"));
    assertTrue(adminRepository.existsByEmail("other-admin@example.org"));
  }

  @Test
  public void delete_removes_only_the_matching_moderator() {
    Moderator moderator = moderatorRepository.save(new Moderator("moderator@example.org"));
    moderatorRepository.save(new Moderator("other-moderator@example.org"));

    moderatorRepository.delete(moderator);

    assertFalse(moderatorRepository.existsByEmail("moderator@example.org"));
    assertTrue(moderatorRepository.existsByEmail("other-moderator@example.org"));
  }
}
