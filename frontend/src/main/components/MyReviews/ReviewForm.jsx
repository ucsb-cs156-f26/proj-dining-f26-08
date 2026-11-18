import { Form, Button, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";

function dateTimeLocalValue(dateTime) {
  return dateTime
    ? dateTime.slice(0, 16)
    : new Date().toISOString().slice(0, 16);
}

export default function ReviewForm({
  initialItemName = "",
  initialComments = "",
  initialStars = 5,
  initialDateServed,
  submitAction,
  submitButtonText = "Submit Review",
}) {
  // Stryker disable all
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    defaultValues: {
      reviewerComments: initialComments,
      itemsStars: initialStars,
      dateItemServed: dateTimeLocalValue(initialDateServed),
    },
  });

  const isodate_regex =
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)/i;
  // Stryker restore all

  return (
    <Form onSubmit={handleSubmit(submitAction)}>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="itemName">Item Name</Form.Label>
        <Form.Control
          data-testid="ReviewForm-itemName"
          id="itemName"
          type="text"
          value={initialItemName}
          disabled
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label htmlFor="comments">Comments</Form.Label>
        <Form.Control
          data-testid="ReviewForm-comments"
          id="comments"
          as="textarea"
          rows={3}
          isInvalid={Boolean(errors.reviewerComments)}
          {...register("reviewerComments", {
            maxLength: {
              value: 255,
              message: "Max length 255 characters.",
            },
          })}
        />
        <Form.Control.Feedback type="invalid">
          {errors.reviewerComments?.message}
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label htmlFor="Stars">Stars (1 to 5)</Form.Label>
        <Form.Select
          data-testid="ReviewForm-stars"
          id="Stars"
          {...register("itemsStars", {
            valueAsNumber: true,
          })}
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label htmlFor="dateItemServed">
          Date and Time Item was Served
        </Form.Label>
        <Form.Control
          data-testid="ReviewForm-date"
          id="dateItemServed"
          type="datetime-local"
          isInvalid={Boolean(errors.dateItemServed)}
          {...register("dateItemServed", {
            required: "Date is required.",
            pattern: isodate_regex,
          })}
        />
        <Form.Control.Feedback type="invalid">
          {errors.dateItemServed?.message}
        </Form.Control.Feedback>
      </Form.Group>

      <Row>
        <Col>
          <Button type="submit" data-testid="ReviewForm-submit">
            {submitButtonText}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
