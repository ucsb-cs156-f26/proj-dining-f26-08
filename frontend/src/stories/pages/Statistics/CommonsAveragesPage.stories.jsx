import React from "react";
import { http, HttpResponse } from "msw";
import CommonsAveragesPage from "main/pages/Statistics/CommonsAveragesPage";
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

const averagesByPeriod = {
  ALL: statisticsFixtures.commonsAverages,
  "6M": statisticsFixtures.commonsAverages.slice(0, 3),
  "1M": statisticsFixtures.commonsAverages.slice(0, 2),
  "1W": statisticsFixtures.commonsAverages.slice(0, 1),
};

export default {
  title: "pages/Statistics/CommonsAveragesPage",
  component: CommonsAveragesPage,
};

const Template = (args) => {
  return <CommonsAveragesPage {...args} />;
};

export const LoggedIn = Template.bind({});
LoggedIn.parameters = {
  msw: {
    handlers: [
      ...userHandlers,
      http.get("/api/statistics/commons/averages", ({ request }) => {
        const period = new URL(request.url).searchParams.get("period") || "ALL";
        return HttpResponse.json(averagesByPeriod[period]);
      }),
    ],
  },
};

export const Empty = Template.bind({});
Empty.parameters = {
  msw: {
    handlers: [
      ...userHandlers,
      http.get("/api/statistics/commons/averages", () => {
        return HttpResponse.json([]);
      }),
    ],
  },
};
