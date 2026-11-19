import { useBackend } from "main/utils/useBackend";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import { useParams } from "react-router";
import ReviewsTable from "main/components/Reviews/ReviewsTable";

function capitalizeString(str) {
  return str.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReviewsPage() {
  const { itemid } = useParams();

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

  const { data: menuItems } = useBackend(
    // Stryker disable next-line all : don't test internal caching of React Query
    [`/api/diningcommons/menuitem?id=${itemid}`],
    // Stryker disable next-line all
    {
      // Stryker disable next-line all : the default method is get, so replacing with an empty string will do nothing
      method: "GET",
      // Stryker disable next-line all : id will be defined
      url: `/api/diningcommons/menuitem?id=${itemid}`,
    },
    // Stryker disable next-line all : Don't test empty initial data
    [],
  );

  const itemName = menuItems?.name ?? "";
  const diningHall = menuItems?.diningCommonsCode
    ? capitalizeString(menuItems.diningCommonsCode)
    : "";

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>
          Reviews for {itemName} at {diningHall}
        </h1>
        <ReviewsTable reviews={reviews} />
      </div>
    </BasicLayout>
  );
}
