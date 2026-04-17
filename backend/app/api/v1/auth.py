"""认证 API 端点"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserUpdate,
    ChangePassword,
    TokenResponse,
    UserOut,
)
from app.schemas.common import ResponseBase
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=ResponseBase[TokenResponse], summary="用户注册")
async def register(
    body: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """
    用户注册

    - 检查用户名和邮箱唯一性
    - 哈希密码，创建用户
    - 返回 JWT 令牌和用户信息
    """
    try:
        user, token = await auth_service.register_user(
            db,
            username=body.username,
            email=body.email,
            password=body.password,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ResponseBase(
        data=TokenResponse(
            access_token=token,
            user=UserOut.model_validate(user),
        )
    )


@router.post("/login", response_model=ResponseBase[TokenResponse], summary="用户登录")
async def login(
    body: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    用户登录

    - 支持用户名或邮箱登录
    - 验证密码
    - 返回 JWT 令牌和用户信息
    """
    try:
        user, token = await auth_service.login_user(
            db,
            username=body.username,
            password=body.password,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    return ResponseBase(
        data=TokenResponse(
            access_token=token,
            user=UserOut.model_validate(user),
        )
    )


@router.get("/me", response_model=ResponseBase[UserOut], summary="获取当前用户信息")
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """获取当前登录用户的信息"""
    return ResponseBase(data=UserOut.model_validate(current_user))


@router.put("/me", response_model=ResponseBase[UserOut], summary="更新用户信息")
async def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    更新当前用户信息

    - 支持更新头像 URL 和偏好设置
    """
    user = await auth_service.update_user(
        db,
        user=current_user,
        updates=body.model_dump(exclude_none=True),
    )
    await db.commit()
    return ResponseBase(data=UserOut.model_validate(user))


@router.put("/password", response_model=ResponseBase, summary="修改密码")
async def change_password(
    body: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    修改当前用户密码

    - 需要验证旧密码
    """
    try:
        await auth_service.change_password(
            db,
            user=current_user,
            old_password=body.old_password,
            new_password=body.new_password,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ResponseBase(data=None, message="密码修改成功")
