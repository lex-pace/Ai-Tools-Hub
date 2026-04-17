"""自定义异常类"""


class NotFoundError(Exception):
    """资源未找到"""

    def __init__(self, resource: str, resource_id: str = ""):
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} 未找到: {resource_id}")


class BadRequestError(Exception):
    """请求参数错误"""

    def __init__(self, message: str = "请求参数错误"):
        self.message = message
        super().__init__(message)


class UnauthorizedError(Exception):
    """未授权"""

    def __init__(self, message: str = "请先登录"):
        self.message = message
        super().__init__(message)


class ForbiddenError(Exception):
    """无权限"""

    def __init__(self, message: str = "无权限执行此操作"):
        self.message = message
        super().__init__(message)


class RateLimitError(Exception):
    """请求过于频繁"""

    def __init__(self, message: str = "请求过于频繁，请稍后再试"):
        self.message = message
        super().__init__(message)


class ExternalServiceError(Exception):
    """外部服务调用失败"""

    def __init__(self, service: str, detail: str = ""):
        self.service = service
        self.detail = detail
        super().__init__(f"{service} 服务调用失败: {detail}")
