export class ResponseHelper {
  static success<T>(data: T, message = 'OK') {
    return { statusCode: 200, message, data };
  }

  static created<T>(data: T, message = 'Created') {
    return { statusCode: 201, message, data };
  }

  static paginated<T>(data: T[], total: number, page: number, limit: number) {
    return {
      statusCode: 200,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
