package edu.ucsb.cs156.dining.migrations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class RoleTablesMigrationTests {
  private static final String CHANGELOG = "db/migration/changelog-master.json";

  @Test
  void fresh_database_uses_email_primary_keys() throws Exception {
    try (Connection connection = newDatabase()) {
      migrate(connection, CHANGELOG);

      assertEmailPrimaryKey(connection, "ADMINS");
      assertEmailPrimaryKey(connection, "MODERATORS");
    }
  }

  @Test
  void upgrade_preserves_distinct_role_emails_and_can_be_run_again() throws Exception {
    try (Connection connection = newDatabase()) {
      createLegacyRoleTables(connection);
      for (String table : List.of("admins", "moderators")) {
        try (var statement = connection.createStatement()) {
          statement.executeUpdate(
              "INSERT INTO "
                  + table
                  + " (email) VALUES ('first@example.org'),"
                  + " ('first@example.org'), ('second@example.org')");
        }
      }

      migrate(connection, CHANGELOG);
      migrate(connection, CHANGELOG);

      for (String table : List.of("ADMINS", "MODERATORS")) {
        assertEmailPrimaryKey(connection, table);
        try (var statement = connection.createStatement();
            var rows = statement.executeQuery("SELECT email FROM " + table + " ORDER BY email")) {
          List<String> emails = new ArrayList<>();
          while (rows.next()) {
            emails.add(rows.getString("email"));
          }
          assertEquals(List.of("first@example.org", "second@example.org"), emails);
        }
      }
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"admins", "moderators"})
  void upgrade_halts_before_changing_role_tables_if_an_email_is_null(String table)
      throws Exception {
    try (Connection connection = newDatabase()) {
      createLegacyRoleTables(connection);
      try (var statement = connection.createStatement()) {
        statement.executeUpdate("INSERT INTO " + table + " (email) VALUES (NULL)");
      }

      assertThrows(LiquibaseException.class, () -> migrate(connection, CHANGELOG));

      for (String roleTable : List.of("ADMINS", "MODERATORS")) {
        try (var columns = connection.getMetaData().getColumns(null, null, roleTable, "ID")) {
          assertTrue(columns.next());
        }
      }
      try (var statement = connection.createStatement();
          var rows =
              statement.executeQuery("SELECT COUNT(*) FROM " + table + " WHERE email IS NULL")) {
        assertTrue(rows.next());
        assertEquals(1, rows.getInt(1));
      }
    }
  }

  private Connection newDatabase() throws SQLException {
    return DriverManager.getConnection("jdbc:h2:mem:roles-" + UUID.randomUUID(), "sa", "");
  }

  private void createLegacyRoleTables(Connection connection) throws Exception {
    migrate(connection, "db/migration/changes/Admin.json");
    migrate(connection, "db/migration/changes/Moderator.json");
  }

  private void migrate(Connection connection, String changelog) throws Exception {
    try (var resources = new ClassLoaderResourceAccessor()) {
      Liquibase liquibase = new Liquibase(changelog, resources, new JdbcConnection(connection));
      liquibase.update(new Contexts(), new LabelExpression());
    }
  }

  private void assertEmailPrimaryKey(Connection connection, String table) throws SQLException {
    try (var primaryKeys = connection.getMetaData().getPrimaryKeys(null, null, table)) {
      assertTrue(primaryKeys.next());
      assertEquals("EMAIL", primaryKeys.getString("COLUMN_NAME"));
      assertFalse(primaryKeys.next());
    }
    try (var columns = connection.getMetaData().getColumns(null, null, table, "ID")) {
      assertFalse(columns.next());
    }
    try (var statement = connection.createStatement()) {
      statement.executeUpdate("INSERT INTO " + table + " (email) VALUES ('check@example.org')");
      assertThrows(
          SQLException.class,
          () ->
              statement.executeUpdate(
                  "INSERT INTO " + table + " (email) VALUES ('check@example.org')"));
      assertThrows(
          SQLException.class,
          () -> statement.executeUpdate("INSERT INTO " + table + " (email) VALUES (NULL)"));
      statement.executeUpdate("DELETE FROM " + table + " WHERE email = 'check@example.org'");
    }
  }
}
