# Generated from MCP data at 2025-10-10T17:50:03.767Z
# Original URL: https://test.com
# Instructions: test

Feature: Test test.com - clicking
  As a user
  I want to test the functionality of test.com
  So that I can ensure it works correctly

  Scenario: Test basic functionality
    Given I navigate to "https://test.com"
    When I click on the element "button"
    Then the element should be visible
