import { useBackend } from "main/utils/useBackend";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { useNavigate, useParams } from "react-router";
import { Button } from "react-bootstrap";
import ReviewsTable from "main/components/Reviews/ReviewsTable";

export default function ReviewsPage() {
  const { itemid } = useParams();
  const navigate = useNavigate();

  const {
    data: reviews,
    error: _error,
    status: _status,
  } = useBackend(
    // Stryker disable next-line all : don't test internal caching of React Query
    [`/api/reviews/approved/forItem/${itemid}`],
    // Stryker disable next-line all : don't test internal caching of React Query
    { method: "GET", url: `/api/reviews/approved/forItem/${itemid}` },
    [],
  );

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Reviews for Menu Item {itemid}</h1>

        <Button
          variant="warning"
          className="mb-3"
          onClick={() => navigate(`/reviews/post/${itemid}`)}
        >
          Review Item
        </Button>

        <ReviewsTable reviews={reviews} />
      </div>
    </BasicLayout>
  );
}
