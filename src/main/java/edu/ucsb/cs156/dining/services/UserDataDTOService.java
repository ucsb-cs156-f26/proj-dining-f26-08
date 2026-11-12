package edu.ucsb.cs156.dining.services;

import edu.ucsb.cs156.dining.entities.User;
import edu.ucsb.cs156.dining.models.UserDTO;
import edu.ucsb.cs156.dining.repositories.AdminRepository;
import edu.ucsb.cs156.dining.repositories.ModeratorRepository;
import edu.ucsb.cs156.dining.repositories.UserRepository;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class UserDataDTOService {

  @Autowired UserRepository userRepository;

  @Autowired AdminRepository adminRepository;

  @Autowired ModeratorRepository moderatorRepository;

  @Value("${app.admin.emails}")
  private String adminEmails;

  public Page<UserDTO> getUserDataDTOs(Pageable pageable) {
    List<String> configuredAdmins = Arrays.asList(adminEmails.split(","));

    Page<User> users = userRepository.findAll(pageable);

    return users.map(
        user -> {
          String email = user.getEmail();
          boolean isAdmin =
              configuredAdmins.contains(email) || adminRepository.existsByEmail(email);
          boolean isModerator = moderatorRepository.existsByEmail(email);

          return new UserDTO(user, isAdmin, isModerator);
        });
  }
}
