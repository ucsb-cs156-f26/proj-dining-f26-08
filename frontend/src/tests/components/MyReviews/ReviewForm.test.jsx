import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReviewForm from "main/components/MyReviews/ReviewForm";
import { test, vi, expect } from "vitest";

describe("ReviewForm tests", () => {
  const testids = [
    "ReviewForm-itemName",
    "ReviewForm-comments",
    "ReviewForm-stars",
    "ReviewForm-date",
    "ReviewForm-submit",
  ];

  test("renders provided initial values and trims datetime-local seconds", () => {
    render(
      <ReviewForm
        initialItemName="Pasta"
        initialComments="Great texture"
        initialStars={4}
        initialDateServed="2024-04-01T12:34:56"
        submitAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Item Name")).toHaveValue("Pasta");
    expect(screen.getByLabelText("Item Name")).toBeDisabled();
    expect(screen.getByLabelText("Comments")).toHaveValue("Great texture");
    expect(screen.getByLabelText("Stars (1 to 5)")).toHaveValue("4");
    expect(screen.getByLabelText("Date and Time Item was Served")).toHaveValue(
      "2024-04-01T12:34",
    );
  });

  test("Error messsage on missing date", async () => {
    render(<ReviewForm submitAction={vi.fn()} />);
    await screen.findByTestId(testids[4]);
    fireEvent.change(screen.getByTestId(testids[3]), { target: { value: "" } });
    fireEvent.click(screen.getByTestId(testids[4]));

    expect(await screen.findByText("Date is required.")).toBeInTheDocument();
  });

  test("No missing input error messsage when date has input", async () => {
    const mockSubmitAction = vi.fn();
    render(<ReviewForm submitAction={mockSubmitAction} />);

    for (const id of testids) {
      await screen.findByTestId(id);
    }

    const dateField = screen.getByTestId(testids[3]);

    fireEvent.change(dateField, {
      target: { value: "2022-01-02T12:00" },
    });
    const submitButton = screen.getByText(/Submit Review/);

    fireEvent.click(submitButton);

    await waitFor(() => expect(mockSubmitAction).toHaveBeenCalled());

    expect(screen.queryByText("Date is required.")).not.toBeInTheDocument();
  });

  test("Error message on too long comment input", async () => {
    const mockSubmitAction = vi.fn();

    render(<ReviewForm submitAction={mockSubmitAction} />);

    const submitButton = screen.getByText(/Submit Review/);

    expect(await screen.findByText("Comments")).toBeInTheDocument();

    const Input = screen.getByTestId(`${testids[1]}`);

    fireEvent.change(Input, { target: { value: "a".repeat(256) } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Max length 255 characters./),
      ).toBeInTheDocument();
    });
  });
});
