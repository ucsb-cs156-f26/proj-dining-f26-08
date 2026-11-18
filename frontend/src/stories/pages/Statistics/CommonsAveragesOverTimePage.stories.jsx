import React from "react";
import { http, HttpResponse } from "msw";
import CommonsAveragesOverTimePage from "main/pages/Statistics/CommonsAveragesOverTimePage";
import { statisticsFixtures } from "fixtures/statisticsFixtures";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

const userHandlers = [
  http.get("/api/currentUser", () => {
    return HttpResponse.json(apiCurrentUserFixtures.userOnly);
  }),
  http.get("/api/systemInfo", () => {
    return HttpResponse.json(systemInfoFixtures.showingNeither);
  }),
];

export default {
  title: "pages/Statistics/CommonsAveragesOverTimePage",
  component: CommonsAveragesOverTimePage,
};

const Template = (args) => {
  return <CommonsAveragesOverTimePage {...args} />;
};

export const LoggedIn = Template.bind({});
LoggedIn.parameters = {
  msw: {
    handlers: [
      ...userHandlers,
      http.get("/api/statistics/commons/averages/overtime", () => {
        return HttpResponse.json(statisticsFixtures.commonsOverTime);
      }),
    ],
  },
};

export const Empty = Template.bind({});
Empty.parameters = {
  msw: {
    handlers: [
      ...userHandlers,
      http.get("/api/statistics/commons/averages/overtime", () => {
        return HttpResponse.json([]);
      }),
    ],
  },
};
