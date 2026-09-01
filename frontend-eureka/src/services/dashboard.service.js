import api from "./api";

const getDashboardSummary = async (year, orgId) => {
  const params = {};
  if (year) params.year = year;
  if (orgId) params.org_id = orgId;
  const response = await api.get("/api/v1/dashboard/summary", { params });
  return response.data;
};

const dashboardService = { getDashboardSummary };

export default dashboardService;