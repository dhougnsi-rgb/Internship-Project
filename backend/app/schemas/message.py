from pydantic import BaseModel


class MessageCreate(BaseModel):
    recipient_id: int | None = None
    recipient_name: str | None = None
    text: str


class MessageOut(BaseModel):
    id: int
    sender_id: int | None = None
    recipient_id: int | None = None
    sender_name: str | None = None
    recipient_name: str | None = None
    text: str
    created_at: str | None = None

    class Config:
        from_attributes = True
