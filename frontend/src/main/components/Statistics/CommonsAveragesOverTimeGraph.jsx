import React from "react";

const COLORS = ["#005ea8", "#a23b00", "#287a37", "#783fa0"];

function monthNumber(period) {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

export default function CommonsAveragesOverTimeGraph({ rows }) {
  if (rows.length === 0) return null;

  const periods = [...new Set(rows.map((row) => row.period))].sort();
  const codes = [...new Set(rows.map((row) => row.diningCommonsCode))].sort();
  const firstMonth = monthNumber(periods[0]);
  const monthSpan = monthNumber(periods[periods.length - 1]) - firstMonth;
  const width = Math.max(600, periods.length * 90);
  const plotWidth = width - 100;
  const x = (period) =>
    monthSpan === 0
      ? 60 + plotWidth / 2
      : 60 + ((monthNumber(period) - firstMonth) / monthSpan) * plotWidth;
  const y = (score) => 260 - ((score - 1) / 4) * 220;

  return (
    <figure>
      <div className="overflow-auto">
        <svg
          role="img"
          aria-label="Average review scores by dining commons over time"
          viewBox={`0 0 ${width} 320`}
          style={{ width: "100%", minWidth: width }}
        >
          <desc>
            Monthly average scores on a scale of 1 to 5. Points show months with
            reviews; missing months have no score. Exact values are in the table
            below.
          </desc>
          {[1, 2, 3, 4, 5].map((score) => (
            <g key={score}>
              <line
                x1="60"
                x2={width - 40}
                y1={y(score)}
                y2={y(score)}
                stroke="#dee2e6"
              />
              <text x="45" y={y(score) + 5} textAnchor="end">
                {score}
              </text>
            </g>
          ))}
          <text x="60" y="20">
            Average score
          </text>
          {periods.map((period) => (
            <text key={period} x={x(period)} y="285" textAnchor="middle">
              {period}
            </text>
          ))}
          <text x={60 + plotWidth / 2} y="310" textAnchor="middle">
            Month served
          </text>
          {codes.map((code, index) => {
            const points = rows
              .filter((row) => row.diningCommonsCode === code)
              .sort((a, b) => a.period.localeCompare(b.period));
            const color = COLORS[index % COLORS.length];
            return (
              <g key={code}>
                {points.map((row, pointIndex) => {
                  const previous = points[pointIndex - 1];
                  return (
                    <React.Fragment key={row.period}>
                      {previous &&
                        monthNumber(row.period) -
                          monthNumber(previous.period) ===
                          1 && (
                          <line
                            x1={x(previous.period)}
                            y1={y(previous.averageStars)}
                            x2={x(row.period)}
                            y2={y(row.averageStars)}
                            stroke={color}
                            strokeWidth="2"
                            strokeDasharray={`${index + 2} ${index}`}
                          />
                        )}
                      <circle
                        cx={x(row.period)}
                        cy={y(row.averageStars)}
                        r="5"
                        fill={color}
                      >
                        <title>
                          {`${code}, ${row.period}: ${row.averageStars.toFixed(2)} (${row.reviewCount} reviews)`}
                        </title>
                      </circle>
                    </React.Fragment>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption>
        {codes.map((code, index) => (
          <span key={code} className="d-inline-block me-3">
            <svg width="30" height="12" aria-hidden="true">
              <line
                x1="0"
                y1="6"
                x2="30"
                y2="6"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth="2"
                strokeDasharray={`${index + 2} ${index}`}
              />
              <circle
                cx="15"
                cy="6"
                r="4"
                fill={COLORS[index % COLORS.length]}
              />
            </svg>{" "}
            {code}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
