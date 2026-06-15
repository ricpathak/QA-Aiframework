---
title: "Sample Testcases"
source: /home/user/QA-Aiframework/data/sample-testcases.xlsx
sheets: 2
converted: 2026-06-15
---

# Sample Testcases

## Login Tests

| Test ID | Test Name        | Precondition    | Steps                                    | Expected Result                         | Tag         |
| ------- | ---------------- | --------------- | ---------------------------------------- | --------------------------------------- | ----------- |
| TC-001  | Valid login      | User registered | Enter valid credentials and click Login  | Dashboard is displayed                  | @smoke      |
| TC-002  | Invalid password | User registered | Enter wrong password and click Login     | Error message shown                     | @regression |
| TC-003  | Empty fields     | None            | Click Login without entering credentials | Validation errors shown for both fields | @regression |
| TC-004  | Locked-out user  | User is locked  | Enter locked user credentials            | Account locked message displayed        | @smoke      |

## Cart Tests

| Test ID | Test Name | Preconditions | Test Procedure | Expected Results | Tags |
| ------ | ---------- | ----------- | -------- | -------- | -------------------------- | ----------- |
| TC-010 | Add product to cart | User is logged in | Click "Add to cart" on the product page | The product is added to the cart and the cart icon is updated | @smoke |
| TC-011 | Delete item from cart | There is one item in cart | Click "Delete" on the cart page | Cart becomes empty | @regression |
| TC-012 | Change quantity | There is 1 item in the cart | Change quantity to 2 | Total amount will be doubled | @regression |
