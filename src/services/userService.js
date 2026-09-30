import axiosInstance from "./axiosInstance";

export const getUsers = async () => {
  const response =
    await axiosInstance.get(
      "/users?limit=30&skip=0&select=firstName,lastName,image,email"
    );

  return response.data.users;
};

export const searchUsers = async (
  query
) => {
  const response =
    await axiosInstance.get(
      `/users/search?q=${encodeURIComponent(
        query
      )}&limit=30&select=firstName,lastName,image,email`
    );

  return response.data.users;
};

export const getUserById = async (
  userId
) => {
  const response =
    await axiosInstance.get(
      `/users/${userId}`
    );

  return response.data;
};