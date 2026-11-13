import React, { useState } from "react";
import { Form } from "react-bootstrap";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import CommonsAveragesTable from "main/components/Statistics/CommonsAveragesTable";
import { useBackend } from "main/utils/useBackend";
import { PERIOD_OPTIONS } from "main/pages/Statistics/statisticsConstants";

export default function CommonsAveragesPage() {
  const [period, setPeriod] = useState("ALL");
  const { data: averages } = useBackend(
    ["/api/statistics/commons/averages", period],
    {
      method: "GET",
      url: "/api/statistics/commons/averages",
      params: { period },
    },
    [],
  );

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Dining Commons Averages</h1>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="CommonsAveragesPage-period-select">
            Time period
          </Form.Label>
          <Form.Select
            id="CommonsAveragesPage-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        {averages && averages.length === 0 ? (
          <p data-testid="CommonsAveragesPage-empty">
            No reviews available for this period yet.
          </p>
        ) : (
          <CommonsAveragesTable
            averages={averages}
            testIdPrefix="CommonsAveragesPage-table"
          />
        )}
      </div>
    </BasicLayout>
  );
}
