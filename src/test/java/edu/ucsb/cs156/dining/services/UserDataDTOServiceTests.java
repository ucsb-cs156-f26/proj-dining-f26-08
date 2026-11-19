package edu.ucsb.cs156.dining.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import edu.ucsb.cs156.dining.entities.User;
import edu.ucsb.cs156.dining.models.UserDTO;
import edu.ucsb.cs156.dining.repositories.AdminRepository;
import edu.ucsb.cs156.dining.repositories.ModeratorRepository;
import edu.ucsb.cs156.dining.repositories.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class UserDataDTOServiceTests {

  @Mock UserRepository userRepository;
  @Mock AdminRepository adminRepository;
  @Mock ModeratorRepository moderatorRepository;

  @InjectMocks UserDataDTOService service;

  @BeforeEach
  void setUp() {
    ReflectionTestUtils.setField(
        service, "adminEmails", "superadmin@example.org,secondadmin@example.org");
  }

  @Test
  void returns_paginated_users_with_correct_roles() {
    User regular = User.builder().id(1L).email("regular@example.org").build();
    User admin = User.builder().id(2L).email("admin@example.org").build();
    User moderator = User.builder().id(3L).email("moderator@example.org").build();
    User configuredAdmin = User.builder().id(4L).email("superadmin@example.org").build();
    User secondConfiguredAdmin = User.builder().id(5L).email("secondadmin@example.org").build();

    Pageable pageable = PageRequest.of(0, 5);
    Page<User> users =
        new PageImpl<>(
            List.of(regular, admin, moderator, configuredAdmin, secondConfiguredAdmin),
            pageable,
            5);

    when(userRepository.findAll(pageable)).thenReturn(users);

    when(adminRepository.existsByEmail("regular@example.org")).thenReturn(false);
    when(adminRepository.existsByEmail("admin@example.org")).thenReturn(true);
    when(adminRepository.existsByEmail("moderator@example.org")).thenReturn(false);

    when(moderatorRepository.existsByEmail(anyString()))
        .thenAnswer(
            invocation -> invocation.getArgument(0, String.class).equals("moderator@example.org"));

    Page<UserDTO> result = service.getUserDataDTOs(pageable);

    assertEquals(5, result.getTotalElements());
    assertEquals(5, result.getContent().size());
    assertEquals(0, result.getNumber());
    assertEquals(5, result.getSize());

    assertEquals(new UserDTO(regular, false, false), result.getContent().get(0));
    assertEquals(new UserDTO(admin, true, false), result.getContent().get(1));
    assertEquals(new UserDTO(moderator, false, true), result.getContent().get(2));
    assertEquals(new UserDTO(configuredAdmin, true, false), result.getContent().get(3));
    assertEquals(new UserDTO(secondConfiguredAdmin, true, false), result.getContent().get(4));

    verify(adminRepository, never()).existsByEmail("superadmin@example.org");
    verify(adminRepository, never()).existsByEmail("secondadmin@example.org");
  }

  @Test
  void returns_empty_page_when_no_users_exist() {
    Pageable pageable = PageRequest.of(1, 10);

    when(userRepository.findAll(pageable)).thenReturn(Page.empty(pageable));

    Page<UserDTO> result = service.getUserDataDTOs(pageable);

    assertTrue(result.isEmpty());
    assertEquals(0, result.getTotalElements());
    assertEquals(1, result.getNumber());

    verifyNoInteractions(adminRepository, moderatorRepository);
  }
}
