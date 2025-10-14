import type {
   ErrorRequestHandler,
   NextFunction,
   Request,
   Response,
} from 'express';

const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.';

export const notFoundHandler = (req: Request, res: Response) => {
   // Ensure consistent 404 responses for mistyped routes.
   res.status(404).json({ error: 'Route not found.' });
};

export const jsonSyntaxErrorHandler: ErrorRequestHandler = (
   error,
   _req,
   res,
   next
) => {
   if (
      error instanceof SyntaxError &&
      'status' in error &&
      (error as { status?: number }).status === 400
   ) {
      // Normalize JSON parse errors into a structured response.
      res.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
   }

   next(error);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
   const status =
      typeof (error as { status?: number }).status === 'number' &&
      Number.isInteger((error as { status?: number }).status)
         ? Math.max(400, Math.min(599, (error as { status?: number }).status!))
         : 500;

   const expose =
      Boolean((error as { expose?: boolean }).expose) || status < 500;

   const responseMessage = expose
      ? error instanceof Error
         ? error.message
         : String(error)
      : GENERIC_ERROR_MESSAGE;

   // Avoid leaking stack traces or secrets but keep enough context for ops.
   console.error('Request failed', {
      path: req.originalUrl,
      method: req.method,
      status,
      message:
         error instanceof Error
            ? error.message
            : (error as { message?: string }).message,
   });

   if (res.headersSent) {
      return;
   }

   res.status(status).json({ error: responseMessage });
};

export function wrapAsync<
   Params extends Record<string, unknown>,
   ResBody,
   ReqBody,
   ReqQuery,
>(
   handler: (
      req: Request<Params, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction
   ) => Promise<unknown>
) {
   // Ensure async controller errors flow to the centralized handler.
   return async (
      req: Request<Params, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction
   ) => {
      try {
         await handler(req, res, next);
      } catch (error) {
         next(error);
      }
   };
}
