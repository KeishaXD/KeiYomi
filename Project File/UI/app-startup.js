// Init Application
(async () => {
  const splashStartedAt = Date.now();
  let initError = null;

  try {
    await loadTranslations();
    await loadData();
    switchTab("library");
    updateReaderModeUI();
  } catch (error) {
    console.error("Gagal inisialisasi aplikasi:", error);
    initError = error;
  } finally {
    const elapsed = Date.now() - splashStartedAt;
    const remainingSplashTime = Math.max(0, MIN_SPLASH_MS - elapsed);
    if (remainingSplashTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingSplashTime));
    }
    document.getElementById("splash-screen").classList.add("hidden");
  }

  if (initError) {
    await customAlert(
      `Gagal memulai aplikasi:\n${initError.message || initError}`,
      "Error",
    );
    return;
  }

  setTimeout(() => {
    scanLocalFolder(true)
      .then(() => {
        if (currentView === "library") {
          renderLibrarySorted();
        }
      })
      .catch((error) => {
        console.error("Gagal scan folder awal:", error);
        showToast(`Gagal scan folder: ${error.message || error}`, 6000);
      });
  }, 1000);
})();
