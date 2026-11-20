package edu.ucsb.cs156.dining.controllers;

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
import edu.ucsb.cs156.dining.entities.Moderator;
import edu.ucsb.cs156.dining.repositories.ModeratorRepository;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(controllers = ModeratorController.class)
@Import(TestConfig.class)
public class ModeratorControllerTests extends ControllerTestCase {

  @MockitoBean ModeratorRepository moderatorRepository;
  @MockitoBean UserRepository userRepository;

  @Test
  public void logged_out_users_cannot_create_list_or_delete_moderators() throws Exception {
    mockMvc
        .perform(post("/api/admin/moderators/post").param("email", "new@ucsb.edu").with(csrf()))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/api/admin/moderators/all")).andExpect(status().isForbidden());
    mockMvc
        .perform(delete("/api/admin/moderators/delete").param("email", "new@ucsb.edu").with(csrf()))
        .andExpect(status().isForbidden());
    verifyNoInteractions(moderatorRepository);
  }

  @ParameterizedTest
  @ValueSource(strings = {"USER", "MODERATOR"})
  public void non_admin_users_cannot_create_list_or_delete_moderators(String role)
      throws Exception {
    mockMvc
        .perform(
            post("/api/admin/moderators/post")
                .param("email", "new@ucsb.edu")
                .with(user("reviewer").roles(role))
                .with(csrf()))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/admin/moderators/all").with(user("reviewer").roles(role)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            delete("/api/admin/moderators/delete")
                .param("email", "new@ucsb.edu")
                .with(user("reviewer").roles(role))
                .with(csrf()))
        .andExpect(status().isForbidden());
    verifyNoInteractions(moderatorRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void admin_writes_require_csrf() throws Exception {
    mockMvc
        .perform(post("/api/admin/moderators/post").param("email", "new@ucsb.edu"))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(delete("/api/admin/moderators/delete").param("email", "new@ucsb.edu"))
        .andExpect(status().isForbidden());
    verifyNoInteractions(moderatorRepository);
  }

  @ParameterizedTest
  @ValueSource(strings = {"new@ucsb.edu", " New@ucsb.edu ", " new@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void admin_can_create_a_moderator_using_a_canonical_trimmed_email(String email)
      throws Exception {
    Moderator moderator = new Moderator("new@ucsb.edu");
    when(moderatorRepository.save(moderator)).thenReturn(moderator);

    mockMvc
        .perform(post("/api/admin/moderators/post").param("email", email).with(csrf()))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"email\":\"new@ucsb.edu\"}"));

    verify(moderatorRepository).existsByEmail("new@ucsb.edu");
    verify(moderatorRepository).save(moderator);
    verifyNoMoreInteractions(moderatorRepository);
  }

  @ParameterizedTest
  @ValueSource(strings = {"new@ucsb.edu", " New@ucsb.edu ", " new@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void duplicate_moderator_emails_are_rejected_without_saving(String email)
      throws Exception {
    when(moderatorRepository.existsByEmail("new@ucsb.edu")).thenReturn(true);

    mockMvc
        .perform(post("/api/admin/moderators/post").param("email", email).with(csrf()))
        .andExpect(status().isBadRequest())
        .andExpect(content().json("{\"message\":\"new@ucsb.edu is already a moderator\"}"));

    verify(moderatorRepository).existsByEmail("new@ucsb.edu");
    verifyNoMoreInteractions(moderatorRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void admin_can_list_moderators() throws Exception {
    when(moderatorRepository.findAll())
        .thenReturn(List.of(new Moderator("first@ucsb.edu"), new Moderator("second@ucsb.edu")));

    mockMvc
        .perform(get("/api/admin/moderators/all"))
        .andExpect(status().isOk())
        .andExpect(
            content().json("[{\"email\":\"first@ucsb.edu\"},{\"email\":\"second@ucsb.edu\"}]"));

    verify(moderatorRepository).findAll();
    verifyNoMoreInteractions(moderatorRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void admin_can_list_an_empty_moderator_table() throws Exception {
    when(moderatorRepository.findAll()).thenReturn(List.of());

    mockMvc
        .perform(get("/api/admin/moderators/all"))
        .andExpect(status().isOk())
        .andExpect(content().json("[]"));

    verify(moderatorRepository).findAll();
  }

  @ParameterizedTest
  @ValueSource(strings = {"other@ucsb.edu", " Other@ucsb.edu ", " other@umail.ucsb.edu "})
  @WithMockUser(roles = "ADMIN")
  public void admin_can_delete_a_moderator_by_email(String email) throws Exception {
    Moderator moderator = new Moderator("other@ucsb.edu");
    when(moderatorRepository.findByEmail("other@ucsb.edu")).thenReturn(Optional.of(moderator));

    mockMvc
        .perform(delete("/api/admin/moderators/delete").param("email", email).with(csrf()))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"message\":\"Moderator with id other@ucsb.edu deleted\"}"));

    verify(moderatorRepository).findByEmail("other@ucsb.edu");
    verify(moderatorRepository).delete(moderator);
    verifyNoMoreInteractions(moderatorRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void deleting_a_missing_moderator_returns_not_found_without_deleting() throws Exception {
    when(moderatorRepository.findByEmail("missing@ucsb.edu")).thenReturn(Optional.empty());

    mockMvc
        .perform(
            delete("/api/admin/moderators/delete").param("email", "missing@ucsb.edu").with(csrf()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("EntityNotFoundException"))
        .andExpect(jsonPath("$.message").value("Moderator with id missing@ucsb.edu not found"));

    verify(moderatorRepository).findByEmail("missing@ucsb.edu");
    verifyNoMoreInteractions(moderatorRepository);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  public void email_is_required_for_create_and_delete() throws Exception {
    mockMvc
        .perform(post("/api/admin/moderators/post").with(csrf()))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(delete("/api/admin/moderators/delete").with(csrf()))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(moderatorRepository);
  }
}
