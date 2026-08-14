# ============================================================
# MyVault - main.py
# Complete FastAPI Backend
#
# Authentication
# Events
# Secure File Upload
# OCR
# File Listing
# File Download / Viewer
# OCR Viewer
# File Search
# File Delete
# ============================================================


# ============================================================
# STANDARD LIBRARY
# ============================================================

from pathlib import Path
from datetime import datetime
import os
import uuid


# ============================================================
# FASTAPI
# ============================================================

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File as FastAPIFile,
    Header,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


# ============================================================
# DATABASE
# ============================================================

from sqlalchemy.orm import Session
from sqlalchemy import extract


# ============================================================
# OCR
# ============================================================

from PIL import Image
import pytesseract
from pdf2image import convert_from_path


# ============================================================
# MYVAULT MODULES
# ============================================================

from database import (
    engine,
    Base,
    get_db,
)

from models import (
    User,
    Event,
    File,
)

from schemas import (
    UserCreate,
    UserLogin,
    EventCreate,
    TokenResponse,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
)


# ============================================================
# APPLICATION CONFIGURATION
# ============================================================

APP_TITLE = "MyVault API"
APP_VERSION = "1.0.0"


# ============================================================
# OCR CONFIGURATION
# ============================================================

TESSERACT_PATH = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

pytesseract.pytesseract.tesseract_cmd = (
    TESSERACT_PATH
)


# ============================================================
# POPPLER CONFIGURATION
# ============================================================

POPPLER_PATH = (
    r"C:\Users\saipr\Downloads"
    r"\Release-26.02.0-0"
    r"\poppler-26.02.0"
    r"\Library\bin"
)


# ============================================================
# UPLOAD CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_FOLDER = BASE_DIR / "uploads"

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


MAX_FILE_SIZE = 10 * 1024 * 1024


ALLOWED_FILE_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
}


# ============================================================
# OCR DEPENDENCY CHECK
# ============================================================

print("======================================")
print("MyVault OCR CONFIGURATION")
print("======================================")

print(
    "Tesseract:",
    TESSERACT_PATH
)

print(
    "Tesseract exists:",
    os.path.isfile(TESSERACT_PATH)
)

print(
    "Poppler:",
    POPPLER_PATH
)

print(
    "Poppler exists:",
    os.path.isdir(POPPLER_PATH)
)

print(
    "Upload folder:",
    UPLOAD_FOLDER
)

print(
    "Upload folder exists:",
    UPLOAD_FOLDER.exists()
)

print("======================================")


# ============================================================
# DATABASE TABLE CREATION
# ============================================================

Base.metadata.create_all(
    bind=engine
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

ALLOWED_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]


app.add_middleware(
    CORSMiddleware,

    allow_origins=ALLOWED_ORIGINS,

    allow_credentials=True,

    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],

    allow_headers=[
        "Authorization",
        "Content-Type",
    ],
)


# ============================================================
# CURRENT USER
# JWT AUTHENTICATION
# ============================================================

def get_current_user(
    authorization: str | None = Header(default=None)
) -> int:

    # --------------------------------------------------------
    # Authorization header missing
    # --------------------------------------------------------

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )


    # --------------------------------------------------------
    # Bearer authentication
    # --------------------------------------------------------

    if not authorization.startswith("Bearer "):

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication scheme."
        )


    # --------------------------------------------------------
    # Extract token
    # --------------------------------------------------------

    token = authorization[7:].strip()


    if not token:

        raise HTTPException(
            status_code=401,
            detail="Missing access token."
        )


    # --------------------------------------------------------
    # Verify JWT
    # --------------------------------------------------------

    try:

        user_id = verify_access_token(
            token
        )

        if not isinstance(user_id, int):

            raise ValueError(
                "Invalid user ID"
            )


        if user_id <= 0:

            raise ValueError(
                "Invalid user ID"
            )


        return user_id


    except (
        ValueError,
        TypeError,
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Welcome to MyVault!",
        "status": "running",
        "version": APP_VERSION,
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "MyVault API",
        "version": APP_VERSION,
        "ocr": os.path.isfile(TESSERACT_PATH),
        "poppler": os.path.isdir(POPPLER_PATH),
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Check existing email
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == user.email
        )
        .first()
    )


    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # --------------------------------------------------------
    # Hash password
    # --------------------------------------------------------

    hashed_password = hash_password(
        user.password
    )


    # --------------------------------------------------------
    # Create user
    # --------------------------------------------------------

    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
    )


    db.add(new_user)

    db.commit()

    db.refresh(new_user)


    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
    }


# ============================================================
# LOGIN
# ============================================================

@app.post(
    "/login",
    response_model=TokenResponse
)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.email == login_data.email
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )


    # --------------------------------------------------------
    # Verify password
    # --------------------------------------------------------

    if not verify_password(
        login_data.password,
        user.password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )


    # --------------------------------------------------------
    # Create JWT
    # --------------------------------------------------------

    access_token = create_access_token(
        user.id
    )


    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
    }


# ============================================================
# CREATE EVENT
# ============================================================

@app.post("/events")
def create_event(
    event: EventCreate,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    new_event = Event(
        user_id=current_user_id,
        title=event.title,
        description=event.description,
        event_date=event.event_date,
    )


    db.add(new_event)

    db.commit()

    db.refresh(new_event)


    return {
        "message": "Event created successfully",
        "event_id": new_event.id,
        "title": new_event.title,
        "description": new_event.description,
        "event_date": new_event.event_date,
        "user_id": new_event.user_id,
    }


# ============================================================
# GET USER EVENTS
# ============================================================

@app.get("/events")
def get_events(
    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    events = (
        db.query(Event)
        .filter(
            Event.user_id == current_user_id
        )
        .all()
    )


    return events


# ============================================================
# DELETE EVENT
# ============================================================

@app.delete("/events/{event_id}")
def delete_event(
    event_id: int,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    event = (
        db.query(Event)
        .filter(
            Event.id == event_id,
            Event.user_id == current_user_id
        )
        .first()
    )


    if not event:

        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )


    db.delete(event)

    db.commit()


    return {
        "message": "Event deleted successfully"
    }


# ============================================================
# UPLOAD FILE
# ============================================================

@app.post("/upload")
def upload_file(

    category: str,

    document_date: str | None = None,

    uploaded_file: UploadFile = FastAPIFile(...),

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    # ========================================================
    # VALIDATE CATEGORY
    # ========================================================

    category = category.strip()


    if not category:

        raise HTTPException(
            status_code=400,
            detail="Category is required."
        )


    if len(category) > 100:

        raise HTTPException(
            status_code=400,
            detail="Category is too long."
        )


    # ========================================================
    # VALIDATE CONTENT TYPE
    # ========================================================

    content_type = (
        uploaded_file.content_type
        or ""
    ).lower()


    if content_type not in ALLOWED_FILE_TYPES:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF, JPEG and PNG files "
                "are allowed."
            )
        )


    # ========================================================
    # VALIDATE ORIGINAL FILENAME
    # ========================================================

    original_filename = (
        uploaded_file.filename
        or "document"
    )


    original_filename = Path(
        original_filename
    ).name


    if not original_filename:

        original_filename = "document"


    if len(original_filename) > 255:

        raise HTTPException(
            status_code=400,
            detail="Filename is too long."
        )


    # ========================================================
    # VALIDATE EXTENSION
    # ========================================================

    file_extension = (
        Path(original_filename)
        .suffix
        .lower()
    )


    if file_extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail="Invalid file extension."
        )


    # ========================================================
    # CHECK CONTENT TYPE + EXTENSION
    # ========================================================

    extension_matches = {
        "application/pdf": {".pdf"},
        "image/jpeg": {".jpg", ".jpeg"},
        "image/png": {".png"},
    }


    if file_extension not in extension_matches.get(
        content_type,
        set()
    ):

        raise HTTPException(
            status_code=400,
            detail="File type does not match file extension."
        )


    # ========================================================
    # CREATE SAFE SERVER FILENAME
    # ========================================================

    unique_filename = (
        f"{uuid.uuid4().hex}"
        f"{file_extension}"
    )


    file_path = (
        UPLOAD_FOLDER /
        unique_filename
    )


    # ========================================================
    # SAVE FILE WITH SIZE LIMIT
    # ========================================================

    total_size = 0


    try:

        with open(
            file_path,
            "wb"
        ) as buffer:

            while True:

                chunk = uploaded_file.file.read(
                    1024 * 1024
                )


                if not chunk:

                    break


                total_size += len(chunk)


                if total_size > MAX_FILE_SIZE:

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "File is too large. "
                            "Maximum size is 10 MB."
                        )
                    )


                buffer.write(chunk)


    except HTTPException:

        if file_path.exists():

            file_path.unlink()


        raise


    except Exception as error:

        if file_path.exists():

            file_path.unlink()


        print(
            "FILE SAVE ERROR:",
            repr(error)
        )


        raise HTTPException(
            status_code=500,
            detail="Could not save file."
        )


    finally:

        try:

            uploaded_file.file.close()

        except Exception:

            pass


    # ========================================================
    # DOCUMENT DATE
    # ========================================================

    parsed_date = None


    if document_date:

        try:

            parsed_date = datetime.fromisoformat(
                document_date
            )


        except ValueError:

            if file_path.exists():

                file_path.unlink()


            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid date. "
                    "Use YYYY-MM-DD."
                )
            )


    # ========================================================
    # OCR
    # ========================================================

    ocr_text = ""


    try:

        # ====================================================
        # PDF OCR
        # ====================================================

        if content_type == "application/pdf":

            print("PDF detected.")

            print(
                "Converting PDF pages to images..."
            )


            if not os.path.isdir(
                POPPLER_PATH
            ):

                raise RuntimeError(
                    "Poppler is not configured correctly."
                )


            pages = convert_from_path(
                str(file_path),
                dpi=200,
                poppler_path=POPPLER_PATH
            )


            print(
                "PDF pages:",
                len(pages)
            )


            text_parts = []


            for page_number, page in enumerate(
                pages,
                start=1
            ):

                print(
                    "OCR processing page",
                    page_number
                )


                text = (
                    pytesseract.image_to_string(
                        page,
                        config="--psm 6"
                    )
                )


                text_parts.append(text)


            ocr_text = "\n".join(
                text_parts
            )


        # ====================================================
        # IMAGE OCR
        # ====================================================

        elif content_type in {
            "image/jpeg",
            "image/png",
        }:

            print("Image detected.")


            with Image.open(
                file_path
            ) as image:

                print(
                    "Image size:",
                    image.size
                )


                if image.mode != "RGB":

                    image = image.convert(
                        "RGB"
                    )


                print(
                    "Running Tesseract OCR..."
                )


                ocr_text = (
                    pytesseract.image_to_string(
                        image,
                        config="--psm 6"
                    )
                )


            print(
                "OCR RESULT:",
                repr(ocr_text)
            )


            print(
                "OCR CHARACTER COUNT:",
                len(ocr_text)
            )


    except Exception as error:

        print(
            "OCR ERROR:",
            repr(error)
        )


        # ----------------------------------------------------
        # File remains available even if OCR fails.
        # ----------------------------------------------------

        ocr_text = ""


    # ========================================================
    # SAVE DATABASE RECORD
    # ========================================================

    new_file = File(

        user_id=current_user_id,

        filename=original_filename,

        filepath=str(file_path),

        file_type=content_type,

        category=category,

        document_date=parsed_date,

        ocr_text=ocr_text,
    )


    try:

        db.add(new_file)

        db.commit()

        db.refresh(new_file)


    except Exception as error:

        db.rollback()


        if file_path.exists():

            file_path.unlink()


        print(
            "DATABASE ERROR:",
            repr(error)
        )


        raise HTTPException(
            status_code=500,
            detail=(
                "Could not save file information."
            )
        )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "message":
            "File uploaded successfully",

        "file_id":
            new_file.id,

        "filename":
            new_file.filename,

        "category":
            new_file.category,

        "document_date":
            new_file.document_date,

        "file_type":
            new_file.file_type,

        "ocr_text":
            ocr_text[:500],

        "ocr_characters":
            len(ocr_text),

        "user_id":
            new_file.user_id,
    }


# ============================================================
# GET USER FILES
# ============================================================

@app.get("/files")
def get_files(

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    files = (
        db.query(File)
        .filter(
            File.user_id == current_user_id
        )
        .all()
    )


    return [

        {
            "id": file.id,

            "filename": file.filename,

            "file_type": file.file_type,

            "category": file.category,

            "document_date": file.document_date,

            "created_at": file.created_at,

            "ocr_text": file.ocr_text or "",
        }

        for file in files
    ]


# ============================================================
# SEARCH FILES
# IMPORTANT:
# Keep this route BEFORE /files/{file_id}/...
# ============================================================

@app.get("/files/search")
def search_files(

    category: str | None = None,

    filename: str | None = None,

    year: int | None = None,

    search_text: str | None = None,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Start with current user's files only
    # --------------------------------------------------------

    query = (
        db.query(File)
        .filter(
            File.user_id == current_user_id
        )
    )


    # ========================================================
    # CATEGORY
    # ========================================================

    if category:

        category = category.strip()

        if category:

            query = query.filter(
                File.category == category
            )


    # ========================================================
    # FILENAME
    # ========================================================

    if filename:

        filename = filename.strip()

        if filename:

            query = query.filter(
                File.filename.ilike(
                    f"%{filename}%"
                )
            )


    # ========================================================
    # YEAR
    # ========================================================

    if year:

        if year < 1900 or year > 2100:

            raise HTTPException(
                status_code=400,
                detail="Invalid year."
            )


        query = query.filter(
            extract(
                "year",
                File.document_date
            ) == year
        )


    # ========================================================
    # OCR TEXT SEARCH
    # ========================================================

    if search_text:

        search_text = search_text.strip()

        if search_text:

            query = query.filter(
                File.ocr_text.ilike(
                    f"%{search_text}%"
                )
            )


    # ========================================================
    # EXECUTE QUERY
    # ========================================================

    files = query.all()


    # ========================================================
    # RESPONSE
    # ========================================================

    return [

        {
            "id": file.id,

            "filename": file.filename,

            "file_type": file.file_type,

            "category": file.category,

            "document_date": file.document_date,

            "created_at": file.created_at,

            "ocr_text": file.ocr_text or "",
        }

        for file in files
    ]


# ============================================================
# DOWNLOAD / OPEN FILE
# ============================================================

@app.get(
    "/files/{file_id}/download"
)
def download_file(

    file_id: int,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # User ownership check
    # --------------------------------------------------------

    file_record = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.user_id == current_user_id
        )
        .first()
    )


    if not file_record:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    # --------------------------------------------------------
    # Physical file
    # --------------------------------------------------------

    file_path = Path(
        file_record.filepath
    )


    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Physical file not found"
        )


    # --------------------------------------------------------
    # Security check:
    # file must remain inside uploads directory
    # --------------------------------------------------------

    try:

        upload_root = UPLOAD_FOLDER.resolve()

        requested_path = file_path.resolve()

        requested_path.relative_to(
            upload_root
        )

    except (
        ValueError,
        OSError,
    ):

        raise HTTPException(
            status_code=403,
            detail="Invalid file path."
        )


    # --------------------------------------------------------
    # Return file
    # --------------------------------------------------------

    return FileResponse(

        path=requested_path,

        filename=file_record.filename,

        media_type=(
            file_record.file_type
            or "application/octet-stream"
        ),

        content_disposition_type="inline",
    )


# ============================================================
# GET OCR TEXT
# ============================================================

@app.get(
    "/files/{file_id}/ocr"
)
def get_ocr_text(

    file_id: int,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    file_record = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.user_id == current_user_id
        )
        .first()
    )


    if not file_record:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    return {

        "file_id":
            file_record.id,

        "filename":
            file_record.filename,

        "ocr_text":
            file_record.ocr_text or "",
    }


# ============================================================
# DELETE FILE
# ============================================================

@app.delete(
    "/files/{file_id}"
)
def delete_file(

    file_id: int,

    current_user_id: int = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find file belonging to current user
    # --------------------------------------------------------

    file_record = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.user_id == current_user_id
        )
        .first()
    )


    if not file_record:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    # ========================================================
    # DELETE PHYSICAL FILE
    # ========================================================

    file_path = Path(
        file_record.filepath
    )


    if file_path.exists():

        try:

            upload_root = UPLOAD_FOLDER.resolve()

            requested_path = file_path.resolve()

            requested_path.relative_to(
                upload_root
            )


        except (
            ValueError,
            OSError,
        ):

            raise HTTPException(
                status_code=403,
                detail="Invalid file path."
            )


        try:

            requested_path.unlink()


        except OSError as error:

            print(
                "FILE DELETE ERROR:",
                repr(error)
            )


            raise HTTPException(
                status_code=500,
                detail=(
                    "Could not delete physical file."
                )
            )


    # ========================================================
    # DELETE DATABASE RECORD
    # ========================================================

    try:

        db.delete(file_record)

        db.commit()


    except Exception as error:

        db.rollback()


        print(
            "DATABASE DELETE ERROR:",
            repr(error)
        )


        raise HTTPException(
            status_code=500,
            detail="Could not delete file record."
        )


    return {
        "message": "File deleted successfully"
    }


# ============================================================
# SERVER STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    print("======================================")
    print("MyVault API started successfully")
    print("======================================")
    print(
        "API: http://127.0.0.1:8000"
    )
    print(
        "Docs: http://127.0.0.1:8000/docs"
    )
    print(
        "OCR ready:",
        os.path.isfile(TESSERACT_PATH)
    )
    print(
        "Poppler ready:",
        os.path.isdir(POPPLER_PATH)
    )
    print(
        "Upload folder:",
        UPLOAD_FOLDER
    )
    print("======================================")