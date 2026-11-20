package edu.ucsb.cs156.dining.controllers;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs156.dining.ControllerTestCase;
import edu.ucsb.cs156.dining.entities.Admin;
import edu.ucsb.cs156.dining.repositories.AdminRepository;
import edu.ucsb.cs156.dining.repositories.UserRepository;
import edu.ucsb.cs156.dining.testconfig.TestConfig;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(controllers = AdminController.class)
@Import(TestConfig.class)
@TestPropertySource(properties = "app.admin.emails=protected@ucsb.edu")
public class AdminControllerTests extends ControllerTestCase {

  @MockitoBean AdminRepository adminRepository;
  @MockitoBean UserRepository userRepository;

  @Test
  public void logged_out_users_cannot_create_list_or_delete_admins() throws Exception {
    mockMvc
        .perform(post("/api/admin/post").param("email", "new@ucsb.edu").with(csrf()))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/api/admin/all")).andExpect(status().isForbidden());
    mockMvc
        .perform(delete("/api/admin/delete").param("email", "new@ucsb.edu").with(csrf()))
        .andExpect(status().isForbidden());
    verifyNoInteractions(adminRepository);
  }

  @ParameterizedTest
  @ValueSource(strings = {"USER", "MODERATOR"})
  public void non_admin_users_cannot_create_list_or_delete_admins(String role) throws Exception {
    mockMvc
        .perform(
            post("/api/admin/post")
                .param("email", "new@ucsb.edu")
                .with(user("reviewer").roles(role))
                .with(csrf()))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/admin/all").with(user("reviewer").roles(role)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            delete("/api/admin/delete")
                .param("email", "new@ucsb.edu")
                .with(user("reviewer").roles(role))
                .with(csrf()))
        .andExpect(status().isForbidden());
    verifyNoInteractions(adminRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void admin_writes_require_csrf() throws Exception {
    mockMvc
        .perform(post("/api/admin/post").param("email", "new@ucsb.edu"))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(delete("/api/admin/delete").param("email", "new@ucsb.edu"))
        .andExpect(status().isForbidden());
    verifyNoInteractions(adminRepository);
  }

  @ParameterizedTest
  @ValueSource(strings = {"new@ucsb.edu", " New@ucsb.edu ", " new@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void admin_can_create_an_admin_using_a_canonical_trimmed_email(String email)
      throws Exception {
    Admin admin = new Admin("new@ucsb.edu");
    when(adminRepository.save(admin)).thenReturn(admin);

    mockMvc
        .perform(post("/api/admin/post").param("email", email).with(csrf()))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"email\":\"new@ucsb.edu\"}"));

    verify(adminRepository).existsByEmail("new@ucsb.edu");
    verify(adminRepository).save(admin);
    verifyNoMoreInteractions(adminRepository);
  }

  @ParameterizedTest
  @ValueSource(strings = {"new@ucsb.edu", " New@ucsb.edu ", " new@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void duplicate_admin_emails_are_rejected_without_saving(String email) throws Exception {
    when(adminRepository.existsByEmail("new@ucsb.edu")).thenReturn(true);

    mockMvc
        .perform(post("/api/admin/post").param("email", email).with(csrf()))
        .andExpect(status().isBadRequest())
        .andExpect(content().json("{\"message\":\"new@ucsb.edu is already an admin\"}"));

    verify(adminRepository).existsByEmail("new@ucsb.edu");
    verifyNoMoreInteractions(adminRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void admin_can_list_admins_and_see_which_are_protected() throws Exception {
    when(adminRepository.findAll())
        .thenReturn(List.of(new Admin("protected@ucsb.edu"), new Admin("other@ucsb.edu")));

    mockMvc
        .perform(get("/api/admin/all"))
        .andExpect(status().isOk())
        .andExpect(
            content()
                .json(
                    """
            [
              {"email":"protected@ucsb.edu","isInAdminEmails":true},
              {"email":"other@ucsb.edu","isInAdminEmails":false}
            ]
            """));

    verify(adminRepository).findAll();
    verifyNoMoreInteractions(adminRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void admin_can_list_an_empty_admin_table() throws Exception {
    when(adminRepository.findAll()).thenReturn(List.of());

    mockMvc
        .perform(get("/api/admin/all"))
        .andExpect(status().isOk())
        .andExpect(content().json("[]"));

    verify(adminRepository).findAll();
  }

  @ParameterizedTest
  @ValueSource(strings = {"other@ucsb.edu", " Other@ucsb.edu ", " other@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void admin_can_delete_an_admin_by_email(String email) throws Exception {
    Admin admin = new Admin("other@ucsb.edu");
    when(adminRepository.findByEmail("other@ucsb.edu")).thenReturn(Optional.of(admin));

    mockMvc
        .perform(delete("/api/admin/delete").param("email", email).with(csrf()))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"message\":\"Admin with id other@ucsb.edu deleted\"}"));

    verify(adminRepository).findByEmail("other@ucsb.edu");
    verify(adminRepository).delete(admin);
    verifyNoMoreInteractions(adminRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void deleting_a_missing_admin_returns_not_found_without_deleting() throws Exception {
    when(adminRepository.findByEmail("missing@ucsb.edu")).thenReturn(Optional.empty());

    mockMvc
        .perform(delete("/api/admin/delete").param("email", "missing@ucsb.edu").with(csrf()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("EntityNotFoundException"))
        .andExpect(jsonPath("$.message").value("Admin with id missing@ucsb.edu not found"));

    verify(adminRepository).findByEmail("missing@ucsb.edu");
    verifyNoMoreInteractions(adminRepository);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"protected@ucsb.edu", " Protected@ucsb.edu ", " protected@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void admins_in_admin_emails_cannot_be_deleted(String email) throws Exception {
    Admin admin = new Admin("protected@ucsb.edu");
    when(adminRepository.findByEmail("protected@ucsb.edu")).thenReturn(Optional.of(admin));

    mockMvc
        .perform(delete("/api/admin/delete").param("email", email).with(csrf()))
        .andExpect(status().isForbidden())
        .andExpect(
            content()
                .json("{\"message\":\"Forbidden to delete an admin from ADMIN_EMAILS list\"}"));

    verify(adminRepository).findByEmail("protected@ucsb.edu");
    verify(adminRepository, never()).delete(admin);
    verifyNoMoreInteractions(adminRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void email_is_required_for_create_and_delete() throws Exception {
    mockMvc.perform(post("/api/admin/post").with(csrf())).andExpect(status().isBadRequest());
    mockMvc.perform(delete("/api/admin/delete").with(csrf())).andExpect(status().isBadRequest());
    verifyNoInteractions(adminRepository);
  }
}
