FROM elasticsearch:8.15.0

LABEL maintainer="AI Tools Hub"

# 安装 IK 中文分词插件（版本必须与 ES 版本一致）
RUN elasticsearch-plugin install --batch https://get.infini.cloud/elasticsearch/analysis-ik/8.15.0
