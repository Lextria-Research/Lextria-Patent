# app/models/__init__.py
from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, Text, Numeric, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from datetime import datetime, timezone
from app.database import Base

# Enums for consistent status values
class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"
    PATENT_ADMIN = "patent_admin"
    PATENT_ADMINISTRATOR = "patent_administrator"
    DRAFTER = "drafter"
    CLIENT = "CLIENT"

class PatentType(enum.Enum):
    PS_ONLY = "PS_ONLY"
    CS_ONLY = "CS_ONLY"
    PS_TO_CS = "PS_TO_CS"

class PatentStatus(enum.Enum):
    # For PS Only workflow
    PS_IDF_SENT_AWAITING_DATA = "PS_IDF_SENT_AWAITING_DATA"
    PS_UNDER_DRAFTING = "PS_UNDER_DRAFTING"
    PS_UNDER_REVIEW = "PS_UNDER_REVIEW"
    PS_WAITING_FOR_CONFIRMATION = "PS_WAITING_FOR_CONFIRMATION"
    PS_SENT_TO_ADMINISTRATOR = "PS_SENT_TO_ADMINISTRATOR"
    PS_FILED = "PS_FILED"
    
    # Checklist Sent Statuses
    CS_CHECKLIST_SENT = "CS_CHECKLIST_SENT"
    CS_CHECKLIST_SENT_POST_PS = "CS_CHECKLIST_SENT_POST_PS"
    
    # For CS Only workflow
    CS_WAITING_FOR_DATA = "CS_WAITING_FOR_DATA"
    CS_UNDER_DRAFTING = "CS_UNDER_DRAFTING"
    CS_UNDER_REVIEW = "CS_UNDER_REVIEW"
    CS_WAITING_FOR_CONFIRMATION = "CS_WAITING_FOR_CONFIRMATION"
    CS_SENT_TO_ADMINISTRATOR = "CS_SENT_TO_ADMINISTRATOR"
    CS_FILED = "CS_FILED"
    
    # For PS->CS workflow (includes both PS and CS statuses)
    PS_CS_IDF_SENT_AWAITING_DATA = "PS_CS_IDF_SENT_AWAITING_DATA"
    PS_CS_UNDER_DRAFTING = "PS_CS_UNDER_DRAFTING"
    PS_CS_UNDER_REVIEW = "PS_CS_UNDER_REVIEW"
    PS_CS_WAITING_FOR_CONFIRMATION = "PS_CS_WAITING_FOR_CONFIRMATION"
    PS_CS_SENT_TO_ADMINISTRATOR = "PS_CS_SENT_TO_ADMINISTRATOR"
    PS_CS_FILED = "PS_CS_FILED"
    
    # Post-filing statuses (managed by patent-administrator)
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
    HEARING_HELD = "HEARING_HELD"  
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
    
    # Action Board Resolution Markers
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

class DeadlineType(enum.Enum):
    # Initial filing deadlines
    CS_FILING = "cs_filing"  # 12 months from PS filing
    POA_FORM_26 = "poa_form_26"  # 3 months from filing
    POR_FORM_1 = "por_form_1"  # 6 months from filing
    FORM_18_18A = "form_18_18a"  # 31 months from PS/CS filing
    
    # FER Response workflow deadlines
    FER_F3_RESPONSE = "fer_f3_response"  # 3 months for F3 from FER issued date
    FER_MAIN_RESPONSE = "fer_main_response"  # 6 months for response from FER issued date
    FER_HEARING_F30 = "fer_hearing_f30"  # F30 when 3 days before hearing date
    FER_WRITTEN_STATEMENT = "fer_written_statement"  # WS in 15 days from hearing date
    
    # Renewal deadlines
    RENEWAL_GRANTED = "renewal_granted"  # 3 months if granted
    REJECTION_F24 = "rejection_f24"  # F24 in 1 month if rejected

# --- Ticket Status Enum ---
class TicketStatus(enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Multi-Factor Authentication (MFA / TOTP)
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    
    # Relationships
    patents_created = relationship("Patent", back_populates="created_by_user", foreign_keys="[Patent.created_by]")
    deadlines_managed = relationship("Deadline", back_populates="assigned_to_user")
    tickets = relationship("Ticket", back_populates="user", cascade="all, delete-orphan")
    
    # Link to AI Settings
    ai_usage = relationship("AIUsage", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Patent(Base):
    __tablename__ = "patents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_id = Column(String, unique=True, index=True, nullable=False)
    patent_title = Column(Text, nullable=False)
    patent_type = Column(Enum(PatentType), nullable=False)
    current_status = Column(Enum(PatentStatus), nullable=False)
    
    # Patent details
    patent_applicant = Column(String, nullable=False)
    applicant_address = Column(Text, nullable=False)
    
    applicant_gender = Column(String, nullable=True)
    applicant_nationality = Column(String, nullable=True)
    applicant_country_of_residence = Column(String, nullable=True)
    applicant_entity_type = Column(String, nullable=True)
    
    commitment_date = Column(Date, nullable=True)
    client_id = Column(String, nullable=False)  # Reference to client
    application_no = Column(String, nullable=True)
    date_of_filing = Column(Date, nullable=True)
    inventor_email = Column(String, nullable=False)
    inventor_phone = Column(String, nullable=False)
    
    # Who created this patent
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_by_user = relationship("User", back_populates="patents_created", foreign_keys=[created_by])
    
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assignee = relationship("User", foreign_keys=[assigned_to])

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    status_changed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Financial information
    professional_fees = Column(Numeric(10, 2), default=0.00)
    gst_amount = Column(Numeric(10, 2), default=0.00)
    tds_amount = Column(Numeric(10, 2), default=0.00)
    reimbursement = Column(Numeric(10, 2), default=0.00)
    total_amount = Column(Numeric(10, 2), default=0.00)
    payment_received = Column(Numeric(10, 2), default=0.00)
    invoice_status = Column(String, default="not_sent")
    payment_status = Column(String, default="pending")
    
    # Additional fields
    notes = Column(Text)
    priority = Column(String, default="normal")  # normal, high, urgent
    
    # Relationships
    inventors = relationship("Inventor", back_populates="patent", cascade="all, delete-orphan")
    forms = relationship("PatentForm", back_populates="patent", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="patent", cascade="all, delete-orphan")
    status_history = relationship("PatentStatusHistory", back_populates="patent", cascade="all, delete-orphan")
    fer_entries = relationship("FEREntry", back_populates="patent", cascade="all, delete-orphan")

    # Publication & Journal Details
    journal_number = Column(String, nullable=True)
    publication_date = Column(Date, nullable=True)

    # Specific Filing Dates
    ps_filed_date = Column(Date, nullable=True)
    cs_filed_post_ps_date = Column(Date, nullable=True)

    # Flexible JSONB timeline store
    timeline_data = Column(JSONB, nullable=True, default=dict, server_default='{}')

class Inventor(Base):
    __tablename__ = "inventors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id"), nullable=False)
    inventor_name = Column(String, nullable=False)
    inventor_address = Column(Text, nullable=False)
    
    institution = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    country_of_residence = Column(String, nullable=True)
    
    # Relationship
    patent = relationship("Patent", back_populates="inventors")

class Form(Base):
    __tablename__ = "forms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_number = Column(String, unique=True, nullable=False)
    form_name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    patent_forms = relationship("PatentForm", back_populates="form")

class PatentForm(Base):
    __tablename__ = "patent_forms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id"), nullable=False)
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)
    is_selected = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    # Relationships
    patent = relationship("Patent", back_populates="forms")
    form = relationship("Form", back_populates="patent_forms")

class Deadline(Base):
    __tablename__ = "deadlines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id"), nullable=False)
    deadline_type = Column(Enum(DeadlineType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    deadline_date = Column(Date, nullable=False)
    original_deadline = Column(Date, nullable=False)
    
    # Extension management
    extension_months = Column(Integer, default=0)
    max_extension_months = Column(Integer, default=0)
    can_extend = Column(Boolean, default=False)
    
    # Status and assignment
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    assigned_to_user = relationship("User", back_populates="deadlines_managed")
    
    # Metadata
    description = Column(Text)
    priority = Column(String, default="normal")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patent = relationship("Patent", back_populates="deadlines")

class PatentStatusHistory(Base):
    __tablename__ = "patent_status_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id"), nullable=False)
    previous_status = Column(Enum(PatentStatus))
    new_status = Column(Enum(PatentStatus), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text)
    notes = Column(Text)
    
    # Special fields for filing date entry
    filing_date_entered = Column(Date)
    
    # Relationships
    patent = relationship("Patent", back_populates="status_history")

class FEREntry(Base):
    __tablename__ = "fer_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id"), nullable=False)
    fer_date = Column(Date, nullable=False)
    fer_number = Column(String)
    
    # Response deadlines
    f3_deadline = Column(Date)
    main_response_deadline = Column(Date, nullable=False)
    
    # Status tracking
    is_f3_filed = Column(Boolean, default=False)
    f3_filed_date = Column(Date)
    is_response_filed = Column(Boolean, default=False)
    response_filed_date = Column(Date)
    
    # Hearing information
    hearing_date = Column(Date)
    hearing_scheduled = Column(Boolean, default=False)
    f30_deadline = Column(Date)
    is_f30_filed = Column(Boolean, default=False)
    
    # Written statement and final outcome
    written_statement_deadline = Column(Date)
    written_statement_filed = Column(Boolean, default=False)
    written_statement_filed_date = Column(Date)
    final_outcome = Column(String)
    outcome_date = Column(Date)
    
    # Post-outcome deadlines
    renewal_deadline = Column(Date)
    renewal_completed = Column(Boolean, default=False)
    f24_deadline = Column(Date)
    is_f24_filed = Column(Boolean, default=False)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patent = relationship("Patent", back_populates="fer_entries")

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_name = Column(String, unique=True, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    template_type = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id"))
    action = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    record_id = Column(String)
    old_values = Column(Text)
    new_values = Column(Text)
    ip_address = Column(String)
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PatentHistory(Base):
    __tablename__ = "patent_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patent_id = Column(UUID(as_uuid=True), ForeignKey("patents.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    details = Column(JSONB, nullable=True) 

    # Relationships
    user = relationship("User")
    patent = relationship("Patent")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    ticket_number = Column(String, unique=True, index=True, nullable=False)
    subject = Column(String, nullable=False)
    category = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="tickets")

# ==========================================
# ✨ NEW: AI Settings and Usage Tracking
# ==========================================
class AIUsage(Base):
    __tablename__ = "ai_usage"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    
    # Toggles & Limits
    is_enabled = Column(Boolean, default=True)
    model_preference = Column(String, default="fast")  # 'fast' (20 limit) or 'pro' (10 limit)
    custom_limit = Column(Integer, nullable=True)      # Super Admin override
    
    # Tracking
    used_today = Column(Integer, default=0)
    last_reset_date = Column(Date, default=lambda: datetime.now(timezone.utc).date())
    
    user = relationship("User", back_populates="ai_usage")