# Generated from MCP data at 2025-10-11T07:24:02.099Z
# Original URL: https://example.com
# Instructions: Generate test for integration verification

Feature: Test example.com - clicking and filling forms
  As a user
  I want to test the functionality of example.com
  So that I can ensure it works correctly

  Scenario: Test basic functionality
    Given I navigate to "https://example.com"
    When I click on the element "element with ID "test-button""
    And I enter "test value" into the field "element with ID "test-input""
    Then the element should be visible
    And the value condition should be satisfied
