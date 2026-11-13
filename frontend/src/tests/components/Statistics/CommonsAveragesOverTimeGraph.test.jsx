import { render, screen } from "@testing-library/react";
import CommonsAveragesOverTimeGraph from "main/components/Statistics/CommonsAveragesOverTimeGraph";
import { statisticsFixtures } from "fixtures/statisticsFixtures";

describe("CommonsAveragesOverTimeGraph", () => {
  test("plots chronological monthly scores with labels, a legend, and review counts", () => {
    render(
      <CommonsAveragesOverTimeGraph
        rows={[...statisticsFixtures.commonsOverTime].reverse()}
      />,
    );
    const graph = screen.getByRole("img", {
      name: "Average review scores by dining commons over time",
    });
    expect(screen.getByText("Month served")).toBeInTheDocument();
    expect(screen.getByText("Average score")).toBeInTheDocument();
    expect(screen.getByText("carrillo")).toBeInTheDocument();
    expect(screen.getByText("ortega")).toBeInTheDocument();
    expect(
      screen.getByText("carrillo, 2025-03: 4.20 (5 reviews)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ortega, 2025-04: 4.60 (10 reviews)"),
    ).toBeInTheDocument();
    const points = graph.querySelectorAll("circle");
    expect(points).toHaveLength(3);
    expect(points[0]).toHaveAttribute("cx", "60");
    expect(points[0]).toHaveAttribute("cy", "84");
    expect(points[1]).toHaveAttribute("cx", "560");
    expect(points[1]).toHaveAttribute("cy", "106");
    expect(points[2]).toHaveAttribute("fill", "#a23b00");
    expect(graph.querySelectorAll("line")).toHaveLength(6);
    expect(graph).toHaveAttribute("viewBox", "0 0 600 320");
    expect(graph).toHaveStyle({ width: "100%", minWidth: "600px" });
    expect(graph.parentElement).toHaveClass("overflow-auto");
    expect(graph.querySelector("desc")).toHaveTextContent(
      "Monthly average scores on a scale of 1 to 5. Points show months with reviews; missing months have no score. Exact values are in the table below.",
    );
    expect(screen.getByText("Month served")).toHaveAttribute("x", "310");
    const lines = graph.querySelectorAll("line");
    [260, 205, 150, 95, 40].forEach((position, index) => {
      expect(lines[index]).toHaveAttribute("x2", "560");
      expect(lines[index]).toHaveAttribute("y1", `${position}`);
      expect(lines[index]).toHaveAttribute("y2", `${position}`);
      expect(screen.getByText(`${index + 1}`)).toHaveAttribute(
        "y",
        `${position + 5}`,
      );
    });
    const trend = lines[5];
    expect(trend).toHaveAttribute("x1", "60");
    expect(trend).toHaveAttribute("y1", "84");
    expect(trend).toHaveAttribute("x2", "560");
    expect(trend).toHaveAttribute("y2", "106");
    expect(trend).toHaveAttribute("stroke-dasharray", "2 0");
  });

  test("centers a single month and uses the full 1 to 5 scale", () => {
    const { rerender } = render(
      <CommonsAveragesOverTimeGraph
        rows={[
          {
            diningCommonsCode: "portola",
            period: "2026-01",
            averageStars: 1,
            reviewCount: 1,
          },
        ]}
      />,
    );
    expect(screen.getByRole("img").querySelector("circle")).toHaveAttribute(
      "cx",
      "310",
    );
    expect(screen.getByRole("img").querySelector("circle")).toHaveAttribute(
      "cy",
      "260",
    );
    rerender(
      <CommonsAveragesOverTimeGraph
        rows={[
          {
            diningCommonsCode: "portola",
            period: "2026-01",
            averageStars: 5,
            reviewCount: 1,
          },
        ]}
      />,
    );
    expect(screen.getByRole("img").querySelector("circle")).toHaveAttribute(
      "cy",
      "40",
    );
  });

  test("spaces missing months proportionally and leaves gaps without inventing scores", () => {
    render(
      <CommonsAveragesOverTimeGraph
        rows={[
          {
            diningCommonsCode: "carrillo",
            period: "2025-12",
            averageStars: 2,
            reviewCount: 1,
          },
          {
            diningCommonsCode: "ortega",
            period: "2026-01",
            averageStars: 3,
            reviewCount: 1,
          },
          {
            diningCommonsCode: "carrillo",
            period: "2026-03",
            averageStars: 4,
            reviewCount: 1,
          },
        ]}
      />,
    );
    const graph = screen.getByRole("img");
    expect(graph.querySelectorAll("line")).toHaveLength(5);
    expect(screen.getByText("2026-01")).toHaveAttribute(
      "x",
      "226.66666666666666",
    );
    expect(graph.querySelectorAll("circle")).toHaveLength(3);
  });

  test("renders no graph when no monthly reviews exist", () => {
    render(<CommonsAveragesOverTimeGraph rows={[]} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("expands a longer chart and keeps all four commons distinct in its legend", () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      diningCommonsCode: "carrillo",
      period: `2026-0${index + 1}`,
      averageStars: 3,
      reviewCount: 2,
    }));
    rows.push(
      {
        diningCommonsCode: "de-la-guerra",
        period: "2026-01",
        averageStars: 4,
        reviewCount: 3,
      },
      {
        diningCommonsCode: "ortega",
        period: "2026-01",
        averageStars: 2,
        reviewCount: 4,
      },
      {
        diningCommonsCode: "portola",
        period: "2026-01",
        averageStars: 5,
        reviewCount: 5,
      },
    );
    render(<CommonsAveragesOverTimeGraph rows={rows.reverse()} />);
    const graph = screen.getByRole("img");
    expect(graph).toHaveAttribute("viewBox", "0 0 720 320");
    expect(graph).toHaveStyle({ minWidth: "720px" });
    expect(screen.getByText("2026-08")).toHaveAttribute("x", "680");
    const colors = ["#005ea8", "#a23b00", "#287a37", "#783fa0"];
    const legend = screen.getByText("carrillo").closest("figcaption");
    const swatches = legend.querySelectorAll("svg");
    expect(swatches).toHaveLength(4);
    colors.forEach((color, index) => {
      expect(swatches[index]).toHaveAttribute("aria-hidden", "true");
      expect(swatches[index].querySelector("line")).toHaveAttribute(
        "stroke",
        color,
      );
      expect(swatches[index].querySelector("line")).toHaveAttribute(
        "stroke-dasharray",
        `${index + 2} ${index}`,
      );
      expect(swatches[index].querySelector("circle")).toHaveAttribute(
        "fill",
        color,
      );
    });
    const points = graph.querySelectorAll("circle");
    expect(points[8]).toHaveAttribute("fill", "#a23b00");
    expect(points[9]).toHaveAttribute("fill", "#287a37");
    expect(points[10]).toHaveAttribute("fill", "#783fa0");
  });
});
