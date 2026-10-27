# app/schemas.py
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, validator
from datetime import date, datetime
from enum import Enum
import uuid

# Enums matching the database models
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    PATENT_ADMIN = "patent_admin"
    PATENT_ADMINISTRATOR = "patent_administrator"
    DRAFTER = "drafter"
    CLIENT = "CLIENT"

class PatentType(str, Enum):
    PS_ONLY = "PS_ONLY"
    CS_ONLY = "CS_ONLY"
    PS_TO_CS = "PS_TO_CS"

class PatentStatus(str, Enum):
    # For PS Only workflow
    PS_IDF_SENT_AWAITING_DATA = "PS_IDF_SENT_AWAITING_DATA"
    PS_UNDER_DRAFTING = "PS_UNDER_DRAFTING"
    PS_UNDER_REVIEW = "PS_UNDER_REVIEW"
    PS_WAITING_FOR_CONFIRMATION = "PS_WAITING_FOR_CONFIRMATION"
    PS_SENT_TO_ADMINISTRATOR = "PS_SENT_TO_ADMINISTRATOR"
    PS_FILED = "PS_FILED"
    
    # CS Checklist Sent Statuses
    CS_CHECKLIST_SENT = "CS_CHECKLIST_SENT"
    CS_CHECKLIST_SENT_POST_PS = "CS_CHECKLIST_SENT_POST_PS"
    
    # For CS Only workflow
    CS_WAITING_FOR_DATA = "CS_WAITING_FOR_DATA"
    CS_UNDER_DRAFTING = "CS_UNDER_DRAFTING"
    CS_UNDER_REVIEW = "CS_UNDER_REVIEW"
    CS_WAITING_FOR_CONFIRMATION = "CS_WAITING_FOR_CONFIRMATION"
    CS_SENT_TO_ADMINISTRATOR = "CS_SENT_TO_ADMINISTRATOR"
    CS_FILED = "CS_FILED"
    
    # For PS->CS workflow
    PS_CS_IDF_SENT_AWAITING_DATA = "PS_CS_IDF_SENT_AWAITING_DATA"
    PS_CS_UNDER_DRAFTING = "PS_CS_UNDER_DRAFTING"
    PS_CS_UNDER_REVIEW = "PS_CS_UNDER_REVIEW"
    PS_CS_WAITING_FOR_CONFIRMATION = "PS_CS_WAITING_FOR_CONFIRMATION"
    PS_CS_SENT_TO_ADMINISTRATOR = "PS_CS_SENT_TO_ADMINISTRATOR"
    PS_CS_FILED = "PS_CS_FILED"
    
    # Post-filing statuses
    CS_WAITING_FOR_DATA_POST_PS = "CS_WAITING_FOR_DATA_POST_PS"
    CS_UNDER_DRAFTING_POST_PS = "CS_UNDER_DRAFTING_POST_PS"
    CS_UNDER_REVIEW_POST_PS = "CS_UNDER_REVIEW_POST_PS"
    CS_WAITING_FOR_CONFIRMATION_POST_PS = "CS_WAITING_FOR_CONFIRMATION_POST_PS"
    CS_SENT_TO_ADMINISTRATOR_POST_PS = "CS_SENT_TO_ADMINISTRATOR_POST_PS"
    CS_FILED_POST_PS = "CS_FILED_POST_PS"

    # --- Forms & Publication ---
    FORM_9_FILED = "FORM_9_FILED"
    FORM_18_FILED = "FORM_18_FILED"
    FORM_9_FILED_FORM_18_NOT_FILED = "FORM_9_FILED_FORM_18_NOT_FILED"
    FORM_9_NOT_FILED_FORM_18_FILED = "FORM_9_NOT_FILED_FORM_18_FILED"
    BOTH_FORM_9_AND_18_FILED = "BOTH_FORM_9_AND_18_FILED"
    PATENT_PUBLISHED = "PATENT_PUBLISHED"
    
    # RFE and FER workflow
    RFE_RECEIVED = "RFE_RECEIVED"
    FER_DRAFTING = "FER_DRAFTING"
    FER_UNDER_REVIEW = "FER_UNDER_REVIEW"
    FER_FILED = "FER_FILED"
    
    # Response and hearing workflow
    FER_ISSUED_AWAITING_RESPONSE = "FER_ISSUED_AWAITING_RESPONSE"
    RESPONSE_FILED_AWAITING_HEARING = "RESPONSE_FILED_AWAITING_HEARING"
    HEARING_NOTICE_ISSUED = "HEARING_NOTICE_ISSUED"
    AWAITING_WRITTEN_SUBMISSION = "AWAITING_WRITTEN_SUBMISSION"
    WS_FILED_AWAITING_ORDER = "WS_FILED_AWAITING_ORDER"
    GRANTED = "GRANTED"
    NOT_GRANTED = "NOT_GRANTED"
    CHALLENGED = "CHALLENGED"
    
    # Renewal
    RENEWAL_DUE = "RENEWAL_DUE"
    RENEWED = "RENEWED"

    # ==========================================
    # --- Special / Ad-Hoc Actions ---
    # ==========================================
    FORM_3_FILED = "FORM_3_FILED" 
    FORM_30_FILED = "FORM_30_FILED"
    FORM_13_FILED = "FORM_13_FILED"
    FORM_6_FILED = "FORM_6_FILED"
    FORM_4_FILED = "FORM_4_FILED"
    FORM_8_FILED = "FORM_8_FILED"
    FORM_24_FILED = "FORM_24_FILED"
    FORM_27_FILED = "FORM_27_FILED"
    OFFICE_ACTION_RESPONSE_FILED = "OFFICE_ACTION_RESPONSE_FILED"
    PETITION_FILED = "PETITION_FILED"

    # ==========================================
    # --- Resolutions & Structural Markers ---
    # ==========================================
    POA_FORM_26_COMPLETED = "POA_FORM_26_COMPLETED"
    POR_FORM_1_COMPLETED = "POR_FORM_1_COMPLETED"
    CS_FILING_COMPLETED = "CS_FILING_COMPLETED"
    FORM_18_18A_COMPLETED = "FORM_18_18A_COMPLETED"
    FER_F3_RESPONSE_COMPLETED = "FER_F3_RESPONSE_COMPLETED"
    FER_MAIN_RESPONSE_COMPLETED = "FER_MAIN_RESPONSE_COMPLETED"
    FER_HEARING_F30_COMPLETED = "FER_HEARING_F30_COMPLETED"
    FER_WRITTEN_STATEMENT_COMPLETED = "FER_WRITTEN_STATEMENT_COMPLETED"
    RENEWAL_GRANTED_COMPLETED = "RENEWAL_GRANTED_COMPLETED"
    REJECTION_F24_COMPLETED = "REJECTION_F24_COMPLETED"
    APPLICATION_POST_DATED = "APPLICATION_POST_DATED"

# --- Ticket Status Enum ---
class TicketStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
# ---------------------------------

# --- User schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    mfa_enabled: Optional[bool] = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Inventor schemas ---
class InventorBase(BaseModel):
    inventor_name: str
    inventor_address: str
    # ✨ ADDED: New Inventor Details
    institution: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    country_of_residence: Optional[str] = None

class InventorCreate(InventorBase):
    pass

class Inventor(InventorBase):
    id: uuid.UUID
    patent_id: uuid.UUID
    
    class Config:
        from_attributes = True

# --- Form schemas ---
class FormBase(BaseModel):
    form_number: str
    form_name: str
    description: Optional[str] = None
    is_active: bool = True

class FormCreate(FormBase):
    pass

class FormUpdate(BaseModel):
    form_number: Optional[str] = None
    form_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Form(FormBase):
    id: uuid.UUID
    
    class Config:
        from_attributes = True

class PatentFormBase(BaseModel):
    form_id: uuid.UUID
    is_selected: bool = False
    is_completed: bool = False
    notes: Optional[str] = None

class PatentFormCreate(PatentFormBase):
    pass

class PatentForm(PatentFormBase):
    id: uuid.UUID
    patent_id: uuid.UUID
    completed_at: Optional[datetime] = None
    form: Optional[Form] = None
    
    class Config:
        from_attributes = True

# --- Patent schemas ---
class PatentBase(BaseModel):
    tracking_id: str
    patent_title: str
    patent_type: PatentType
    
    patent_applicant: str
    applicant_address: str
    # ✨ ADDED: New Applicant Details
    applicant_gender: Optional[str] = None
    applicant_nationality: Optional[str] = None
    applicant_country_of_residence: Optional[str] = None
    applicant_entity_type: Optional[str] = None

    client_id: str
    application_no: Optional[str] = None
    date_of_filing: Optional[date] = None
    inventor_email: EmailStr
    inventor_phone: str
    professional_fees: Optional[float] = 0.0
    reimbursement: Optional[float] = 0.0
    notes: Optional[str] = None
    priority: str = "normal"
    assigned_to: Optional[uuid.UUID] = None 
    
    # --- New Optional Fields ---
    commitment_date: Optional[date] = None       # Basic Info
    journal_number: Optional[str] = None        # Additional Info
    publication_date: Optional[date] = None      # Additional Info
    ps_filed_date: Optional[date] = None         # Additional Info (Filing Date of PS)
    cs_filed_post_ps_date: Optional[date] = None # Additional Info (CS Filed Post PS Date)
    
    # ==========================================
    # FLEXIBLE JSONB TIMELINE STORE
    # ==========================================
    timeline_data: Optional[Dict[str, Any]] = {}

class PatentCreate(PatentBase):
    inventors: List[InventorCreate]
    selected_forms: List[uuid.UUID] = []

class PatentUpdate(BaseModel):
    tracking_id: Optional[str] = None
    patent_title: Optional[str] = None
    patent_type: Optional[PatentType] = None
    current_status: Optional[PatentStatus] = None
    client_id: Optional[str] = None
    application_no: Optional[str] = None
    date_of_filing: Optional[date] = None
    
    patent_applicant: Optional[str] = None
    applicant_address: Optional[str] = None
    # ✨ ADDED: Updatable Applicant Details
    applicant_gender: Optional[str] = None
    applicant_nationality: Optional[str] = None
    applicant_country_of_residence: Optional[str] = None
    applicant_entity_type: Optional[str] = None
    
    inventor_name: Optional[str] = None
    inventor_address: Optional[str] = None
    inventors: Optional[List[InventorCreate]] = None
    inventor_email: Optional[EmailStr] = None
    inventor_phone: Optional[str] = None
    professional_fees: Optional[float] = None
    reimbursement: Optional[float] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    
    # New Fields (Updates)
    commitment_date: Optional[date] = None
    journal_number: Optional[str] = None
    publication_date: Optional[date] = None
    ps_filed_date: Optional[date] = None
    cs_filed_post_ps_date: Optional[date] = None
    
    # ==========================================
    # FLEXIBLE JSONB TIMELINE STORE
    # ==========================================
    timeline_data: Optional[Dict[str, Any]] = None

class PatentStatusUpdate(BaseModel):
    new_status: PatentStatus
    reason: Optional[str] = None
    notes: Optional[str] = None
    filing_date: Optional[date] = None  # Required when changing to "filed" status
    force_update: Optional[bool] = False  # Admin override to skip deadline validation

class Patent(PatentBase):
    id: uuid.UUID
    current_status: PatentStatus
    created_by: uuid.UUID
    assigned_to: Optional[uuid.UUID] = None 
    
    # Output New Fields
    commitment_date: Optional[date] = None
    journal_number: Optional[str] = None
    publication_date: Optional[date] = None
    ps_filed_date: Optional[date] = None
    cs_filed_post_ps_date: Optional[date] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    status_changed_at: datetime
    gst_amount: float
    tds_amount: float
    total_amount: float
    payment_received: float
    invoice_status: str
    payment_status: str
    inventors: List[Inventor] = []
    forms: List[PatentForm] = []
    
    class Config:
        from_attributes = True

# --- Deadline schemas ---
class DeadlineBase(BaseModel):
    deadline_type: str
    deadline_date: date
    description: Optional[str] = None
    priority: str = "normal"

class DeadlineCreate(DeadlineBase):
    patent_id: uuid.UUID
    assigned_to: Optional[uuid.UUID] = None

class DeadlineUpdate(BaseModel):
    deadline_date: Optional[date] = None
    extension_months: Optional[int] = None
    is_completed: Optional[bool] = None
    assigned_to: Optional[uuid.UUID] = None
    description: Optional[str] = None
    priority: Optional[str] = None

class Deadline(DeadlineBase):
    id: uuid.UUID
    patent_id: uuid.UUID
    original_deadline: date
    extension_months: int
    max_extension_months: int
    can_extend: bool
    is_completed: bool
    completed_at: Optional[datetime] = None
    assigned_to: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DeadlineCompletionRequest(BaseModel):
    completion_notes: Optional[str] = None

# --- FER Entry schemas ---
class FEREntryBase(BaseModel):
    fer_date: date
    fer_number: Optional[str] = None
    notes: Optional[str] = None

class FEREntryCreate(FEREntryBase):
    patent_id: uuid.UUID

class FEREntryUpdate(BaseModel):
    fer_date: Optional[date] = None
    fer_number: Optional[str] = None
    
    # F3 and response tracking
    is_f3_filed: Optional[bool] = None
    f3_filed_date: Optional[date] = None
    is_response_filed: Optional[bool] = None
    response_filed_date: Optional[date] = None
    
    # Hearing information
    hearing_date: Optional[date] = None
    hearing_scheduled: Optional[bool] = None
    is_f30_filed: Optional[bool] = None
    
    # Written statement tracking
    written_statement_filed: Optional[bool] = None
    written_statement_filed_date: Optional[date] = None
    
    # Final outcome
    final_outcome: Optional[str] = None
    outcome_date: Optional[date] = None
    renewal_completed: Optional[bool] = None
    is_f24_filed: Optional[bool] = None
    notes: Optional[str] = None

class FEREntry(FEREntryBase):
    id: uuid.UUID
    patent_id: uuid.UUID
    
    # Deadline calculations
    f3_deadline: date  # 3 months for F3 from FER issued date
    main_response_deadline: date  # 6 months for response from FER issued date
    
    # F3 and response tracking
    is_f3_filed: bool
    f3_filed_date: Optional[date] = None
    is_response_filed: bool
    response_filed_date: Optional[date] = None
    
    # Hearing information
    hearing_date: Optional[date] = None
    hearing_scheduled: bool
    f30_deadline: Optional[date] = None  # F30 when 3 days before hearing
    is_f30_filed: bool
    
    # Written statement deadlines and tracking
    written_statement_deadline: Optional[date] = None  # WS in 15 days from hearing
    written_statement_filed: bool
    written_statement_filed_date: Optional[date] = None
    
    # Final outcome and post-outcome deadlines
    final_outcome: Optional[str] = None  # "granted", "not_granted"
    outcome_date: Optional[date] = None
    renewal_deadline: Optional[date] = None  # 3 months if granted
    renewal_completed: bool
    f24_deadline: Optional[date] = None  # F24 in 1 month if rejected
    is_f24_filed: bool
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==========================================
# ADDED: TICKET SCHEMAS
# ==========================================
class TicketCreate(BaseModel):
    subject: str
    category: str
    message: str

class TicketStatusUpdate(BaseModel):
    status: TicketStatus

# --- ADDED: Schema for the User details embedded in the Ticket ---
class TicketUserDetail(BaseModel):
    full_name: str
    email: str
    
    class Config:
        from_attributes = True

class TicketResponse(BaseModel):
    id: uuid.UUID
    ticket_number: str
    subject: str
    category: str
    message: str
    status: TicketStatus
    user_id: uuid.UUID
    
    # --- ADDED: Attach the User info to the response ---
    user: Optional[TicketUserDetail] = None 
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
# ==========================================


# --- Response schemas ---
class MessageResponse(BaseModel):
    message: str
    success: bool = True

class PatentListResponse(BaseModel):
    patents: List[Patent]
    total: int
    page: int
    size: int
    total_pages: int

class DashboardStats(BaseModel):
    total_patents: int
    patents_by_status: dict
    patents_by_type: dict
    upcoming_deadlines: int
    overdue_deadlines: int
    recent_activities: List[dict]

# Extension request schema
class ExtensionRequest(BaseModel):
    deadline_id: uuid.UUID
    extension_months: int
    reason: str

# Patent history models 
class PatentHistoryResponse(BaseModel):
    id: uuid.UUID
    patent_id: Optional[uuid.UUID]
    patent_tracking_id: Optional[str] = None
    user_id: uuid.UUID
    action: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True

class HistoryListResponse(BaseModel):
    history: List[PatentHistoryResponse]
    total: int
    page: int
    size: int
