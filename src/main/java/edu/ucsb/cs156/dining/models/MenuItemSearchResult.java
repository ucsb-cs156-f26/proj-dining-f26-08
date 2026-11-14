package edu.ucsb.cs156.dining.models;

/** The information needed to identify a matching menu item in the search results. */
public record MenuItemSearchResult(
    long id, String name, String diningCommonsCode, String mealCode, String station) {}
