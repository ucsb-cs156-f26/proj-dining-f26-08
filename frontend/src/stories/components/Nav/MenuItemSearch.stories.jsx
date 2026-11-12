import { useState } from "react";
import MenuItemSearch from "main/components/Nav/MenuItemSearch";
import { menuItemSearchFixtures } from "fixtures/menuItemSearchFixtures";

export default {
  title: "components/Nav/MenuItemSearch",
  component: MenuItemSearch,
};

function InteractiveExample(args) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ maxWidth: 420 }}>
      <MenuItemSearch
        {...args}
        query={query}
        onQueryChange={setQuery}
        onSelect={setSelected}
      />
      {selected && (
        <p data-testid="selected-item">
          Selected: {selected.name} ({selected.diningCommonsCode})
        </p>
      )}
    </div>
  );
}

export const WithResults = {
  args: { results: menuItemSearchFixtures.matches },
  render: (args) => <InteractiveExample {...args} />,
};

export const Loading = {
  args: { results: [], isLoading: true },
  render: (args) => <InteractiveExample {...args} />,
};

export const Empty = {
  args: { results: [] },
  render: (args) => <InteractiveExample {...args} />,
};

export const Error = {
  args: { results: [], error: "Please try again." },
  render: (args) => <InteractiveExample {...args} />,
};
