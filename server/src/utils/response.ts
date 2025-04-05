interface SuccessResponse {
  status: "success";
  data: any;
}

interface ErrorResponse {
  status: "error";
  message: string;
  error?: any;
}

export const successResponse = (data: any) => ({
  status: "success",
  data,
});

export const errorResponse = (message: string, error?: any) => ({
  status: "error",
  message,
  ...(process.env.NODE_ENV === "development" && { error }),
});
