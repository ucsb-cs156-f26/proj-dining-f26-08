import React from "react";
import ItemStatisticsTable from "main/components/Statistics/ItemStatisticsTable";
import { statisticsFixtures } from "fixtures/statisticsFixtures";

export default {
  title: "components/Statistics/ItemStatisticsTable",
  component: ItemStatisticsTable,
};

const Template = (args) => {
  return <ItemStatisticsTable {...args} />;
};

export const Empty = Template.bind({});
Empty.args = {
  items: [],
};

export const BestRatedItems = Template.bind({});
BestRatedItems.args = {
  items: statisticsFixtures.threeBestItems,
};

export const WorstRatedItems = Template.bind({});
WorstRatedItems.args = {
  items: statisticsFixtures.threeWorstItems,
};
