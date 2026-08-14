import sqlite3
from pathlib import Path

import pytesseract
from PIL import Image
from pdf2image import convert_from_path


# Tesseract
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


# Poppler
POPPLER_PATH = (
    r"C:\Users\saipr\.cache\codex-runtimes\codex-primary-runtime"
    r"\dependencies\native\poppler\Library\bin"
)


# Database
DB_PATH = "myvault.db"


conn = sqlite3.connect(DB_PATH)

cursor = conn.cursor()


# Get files without OCR text
cursor.execute("""
    SELECT id, filename, filepath, file_type
    FROM files
    WHERE ocr_text IS NULL
       OR ocr_text = ''
""")

files = cursor.fetchall()


print("Files requiring OCR:", len(files))


for file_id, filename, filepath, file_type in files:

    print("\nProcessing:", filename)

    try:

        ocr_text = ""


        # -------------------------
        # IMAGE
        # -------------------------

        if file_type and file_type.startswith("image/"):

            image = Image.open(filepath)

            ocr_text = pytesseract.image_to_string(
                image
            )


        # -------------------------
        # PDF
        # -------------------------

        elif file_type == "application/pdf":

            pages = convert_from_path(
                filepath,
                dpi=200,
                poppler_path=POPPLER_PATH
            )

            text_parts = []

            for page in pages:

                text_parts.append(
                    pytesseract.image_to_string(page)
                )

            ocr_text = "\n".join(text_parts)


        else:

            print(
                "Skipping unsupported file type:",
                file_type
            )

            continue


        # -------------------------
        # UPDATE DATABASE
        # -------------------------

        cursor.execute(
            """
            UPDATE files
            SET ocr_text = ?
            WHERE id = ?
            """,
            (
                ocr_text,
                file_id
            )
        )


        conn.commit()


        print(
            "OCR characters:",
            len(ocr_text)
        )


    except Exception as error:

        print(
            "OCR ERROR:",
            error
        )


conn.close()


print("\nOCR processing completed.")