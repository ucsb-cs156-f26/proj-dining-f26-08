import React from "react";
import CommonsAveragesOverTimeGraph from "main/components/Statistics/CommonsAveragesOverTimeGraph";
import { statisticsFixtures } from "fixtures/statisticsFixtures";

export default {
  title: "components/Statistics/CommonsAveragesOverTimeGraph",
  component: CommonsAveragesOverTimeGraph,
};

const Template = (args) => {
  return <CommonsAveragesOverTimeGraph {...args} />;
};

export const Empty = Template.bind({});
Empty.args = {
  rows: [],
};

export const MonthlyAverages = Template.bind({});
MonthlyAverages.args = {
  rows: statisticsFixtures.commonsOverTime,
};

export const SingleMonth = Template.bind({});
SingleMonth.args = {
  rows: [statisticsFixtures.commonsOverTime[0]],
};

export const MissingMonths = Template.bind({});
MissingMonths.args = {
  rows: [
    statisticsFixtures.commonsOverTime[0],
    { ...statisticsFixtures.commonsOverTime[1], period: "2025-06" },
  ],
};
