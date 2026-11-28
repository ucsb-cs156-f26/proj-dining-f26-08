package edu.ucsb.cs156.dining.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs156.dining.entities.Admin;
import edu.ucsb.cs156.dining.entities.Moderator;
import edu.ucsb.cs156.dining.services.wiremock.WiremockService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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

    assertEquals(
        List.of(new Admin("duplicate-admin@example.org")),
        adminRepository.findAllByEmail("duplicate-admin@example.org"));
  }

  @Test
  public void saving_a_moderator_email_twice_creates_one_role_entry() {
    moderatorRepository.save(new Moderator("duplicate-moderator@example.org"));
    moderatorRepository.save(new Moderator("duplicate-moderator@example.org"));

    assertEquals(
        List.of(new Moderator("duplicate-moderator@example.org")),
        moderatorRepository.findAllByEmail("duplicate-moderator@example.org"));
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
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public void deleteByEmail_deletes_admin() {
    adminRepository.save(new Admin("admin@example.org"));

    long deleted = adminRepository.deleteByEmail("admin@example.org");

    assertEquals(1, deleted);
    assertFalse(adminRepository.existsByEmail("admin@example.org"));
  }

  @Test
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public void deleteByEmail_returns_zero_for_missing_roles() {
    assertEquals(0, adminRepository.deleteByEmail("missing@example.org"));
    assertEquals(0, moderatorRepository.deleteByEmail("missing@example.org"));
  }

  @Test
  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public void deleteByEmail_deletes_moderator() {
    moderatorRepository.save(new Moderator("moderator@example.org"));

    long deleted = moderatorRepository.deleteByEmail("moderator@example.org");

    assertEquals(1, deleted);
    assertFalse(moderatorRepository.existsByEmail("moderator@example.org"));
  }
}
