"""AI Skills Hub — 用户 Schema"""
import uuid
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    """用户输出"""
    id: uuid.UUID
    username: str
    email: str
    avatar_url: Optional[str] = None
    role: str = "user"
    tier: str = "free"
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserRegister(BaseModel):
    """用户注册"""
    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_\u4e00-\u9fa5]+$",
        description="用户名：字母、数字、下划线、中文，3-50 字符",
    )
    email: EmailStr
    password: str = Field(min_length=6, max_length=100, description="密码：6-100 字符")


class UserLogin(BaseModel):
    """用户登录"""
    username: str = Field(description="用户名或邮箱")
    password: str


class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    """更新用户信息"""
    avatar_url: Optional[str] = None
    preferences: Optional[dict] = None


class ChangePassword(BaseModel):
    """修改密码"""
    old_password: str
    new_password: str = Field(min_length=6, max_length=100, description="新密码：6-100 字符")
