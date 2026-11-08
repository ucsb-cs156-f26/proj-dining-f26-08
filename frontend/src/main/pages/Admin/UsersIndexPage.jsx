import { useState } from "react";
import { Form } from "react-bootstrap";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import UsersTable from "main/components/Users/UsersTable";
import { useBackend } from "main/utils/useBackend";

const usersEndpoint = "/api/admin/users/paged";
const pageSizeOptions = [10, 25, 50, 100, 500];

export default function UsersIndexPage() {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  const { data: users } = useBackend(
    [usersEndpoint, currentPage, pageSize],
    {
      url: usersEndpoint,
      params: {
        page: currentPage,
        size: pageSize,
        sort: "id,asc",
      },
    },
    { content: [], page: { totalPages: 0 } },
  );

  const totalPages = users.page.totalPages;

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(0);
  };

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Users</h1>
        <Form.Group className="mb-3 d-flex align-items-center gap-2">
          <Form.Label className="mb-0">Page Size:</Form.Label>
          <Form.Select
            value={pageSize}
            onChange={handlePageSizeChange}
            data-testid="UsersIndexPage-pageSize"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <UsersTable users={users.content} />

        <div className="d-flex align-items-center gap-2 mt-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage === 0}
            data-testid="UsersIndexPage-prev"
          >
            Previous
          </button>
          <span data-testid="UsersIndexPage-page-info">
            Page {currentPage + 1} of {Math.max(totalPages, 1)}
          </span>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages - 1}
            data-testid="UsersIndexPage-next"
          >
            Next
          </button>
        </div>
      </div>
    </BasicLayout>
  );
}
