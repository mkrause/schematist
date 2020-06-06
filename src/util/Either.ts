
export type Either<L, R> =
    | { left : L }
    | { right : R };

export const Either = {
    left: <L>(left : L) : { left : L } => ({ left }),
    right: <R>(right : R) : { right : R } => ({ right }),
    isLeft: <L>(either : Either<L, unknown>) : either is { left : L } => 'left' in either,
    isRight: <R>(either : Either<unknown, R>) : either is { right : R } => 'right' in either,
    
    map: <L, R, S>(value : Either<L, R>, fn : (right : R) => S) : Either<L, S> => {
        if (Either.isLeft(value)) {
            return value;
        } else {
            return Either.right(fn(value.right));
        }
    },
    
    chain: <L1, R1, L2, R2>(value : Either<L1, R1>, fn : (right : R1) => Either<L2, R2>) : Either<L1 | L2, R2> => {
        if (Either.isLeft(value)) {
            return value;
        } else {
            return fn(value.right);
        }
    },
    
    orThrow: <L, R>(value : Either<L, R>) : R => {
        if (Either.isLeft(value)) {
            throw value.left;
        } else {
            return value.right;
        }
    },
};
