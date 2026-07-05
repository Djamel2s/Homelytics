import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def test_user_can_get_price_prediction():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options,
    )

    try:
        driver.get(FRONTEND_URL)

        inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='number']")
        assert len(inputs) == 8, "Le formulaire doit avoir 8 champs"

        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        wait = WebDriverWait(driver, 10)
        wait.until(
            EC.text_to_be_present_in_element((By.CSS_SELECTOR, "p"), "Prix estimé")
        )
    finally:
        driver.quit()