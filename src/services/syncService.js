export const fakeSync = async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

  const shouldFail = Math.random() < 0.2;

  if (shouldFail) {
    throw new Error("Fake sync failed");
  }

  return {
    success: true,
  };
};