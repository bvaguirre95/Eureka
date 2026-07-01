import api from "./api";

const getDashboardSummary = async (year) => {
  const response = await api.get("/api/v1/dashboard/summary", {
    params: year ? { year } : {},
  });
  return response.data;
};

const dashboardService = { getDashboardSummary };

export default dashboardService;
