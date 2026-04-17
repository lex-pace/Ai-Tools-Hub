"""认证业务服务"""
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserOut


async def register_user(
    db: AsyncSession,
    username: str,
    email: str,
    password: str,
) -> tuple[User, str]:
    """
    注册新用户

    - 检查用户名和邮箱是否已存在
    - 哈希密码，创建用户
    - 生成 JWT 令牌
    - 返回 (用户对象, 令牌字符串)

    :raises ValueError: 用户名或邮箱已存在
    """
    # 检查用户名是否已存在
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise ValueError("用户名已存在")

    # 检查邮箱是否已存在
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise ValueError("邮箱已存在")

    # 创建用户
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # 生成令牌
    token = create_access_token(data={"sub": str(user.id)})

    return user, token


async def login_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> tuple[User, str]:
    """
    用户登录

    - 支持用户名或邮箱登录
    - 验证密码
    - 更新最后登录时间
    - 返回 (用户对象, 令牌字符串)

    :raises ValueError: 用户名/邮箱不存在或密码错误
    """
    # 查找用户（支持用户名或邮箱）
    stmt = select(User).where(
        (User.username == username) | (User.email == username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("用户名或邮箱不存在")

    if not verify_password(password, user.password_hash):
        raise ValueError("密码错误")

    if not user.is_active:
        raise ValueError("用户已被禁用")

    # 更新最后登录时间
    user.last_login_at = datetime.utcnow()
    await db.flush()

    # 生成令牌
    token = create_access_token(data={"sub": str(user.id)})

    return user, token


async def update_user(
    db: AsyncSession,
    user: User,
    updates: dict,
) -> User:
    """
    更新用户信息

    - 支持更新头像 URL 和偏好设置
    - 返回更新后的用户对象
    """
    if "avatar_url" in updates and updates["avatar_url"] is not None:
        user.avatar_url = updates["avatar_url"]
    if "preferences" in updates and updates["preferences"] is not None:
        user.preferences = updates["preferences"]

    await db.flush()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession,
    user: User,
    old_password: str,
    new_password: str,
) -> bool:
    """
    修改密码

    - 验证旧密码
    - 更新为新密码哈希

    :raises ValueError: 旧密码不正确
    """
    if not verify_password(old_password, user.password_hash):
        raise ValueError("旧密码不正确")

    user.password_hash = hash_password(new_password)
    await db.flush()
    return True
