import { isRight } from "fp-ts/lib/Either";
import { StrMap, toArray } from "fp-ts/lib/StrMap";
import { OrganizationFiscalCode } from "italia-ts-commons/lib/strings";
import {
  AmountInEuroCents,
  AmountInEuroCentsFromNumber,
  ApplicationCode,
  CheckDigit,
  IUV13,
  IUV15,
  IUV17,
  PaymentNoticeNumber,
  PaymentNoticeNumber0,
  PaymentNoticeNumber1,
  PaymentNoticeNumber2,
  PaymentNoticeNumber3,
  PaymentNoticeNumberFromString,
  PaymentNoticeQrCode,
  PaymentNoticeQrCodeFromString,
  rptIdFromPaymentNoticeQrCode,
  rptIdFromQrCodeString,
  RptIdFromString,
  SegregationCode
} from "../pagopa";

describe("PaymentNoticeNumberFromString", () => {
  it("should succeed with valid PaymentNoticeNumberFromString", () => {
    const someValidPaymentNoticeNumber: ReadonlyArray<string> = [
      "044012345678901200",
      "144012345678901200",
      "244012345678901200",
      "344012345678901200"
    ];
    someValidPaymentNoticeNumber.map(aValidPaymentNoticeNumber => {
      const validation = PaymentNoticeNumberFromString.decode(
        aValidPaymentNoticeNumber
      );
      expect(isRight(validation)).toBeTruthy();
      if (isRight(validation)) {
        const paymentNoticeNumber = validation.value;
        expect(paymentNoticeNumber.auxDigit).toBeDefined();
        switch (paymentNoticeNumber.auxDigit) {
          case "0":
            expect(paymentNoticeNumber.checkDigit).toBeDefined();
            expect(paymentNoticeNumber.applicationCode).toHaveLength(2);
            expect(paymentNoticeNumber.iuv13).toHaveLength(13);
            break;
          case "1":
            expect(paymentNoticeNumber.iuv17).toHaveLength(17);
            break;
          case "2":
            expect(paymentNoticeNumber.checkDigit).toHaveLength(2);
            expect(paymentNoticeNumber.iuv15).toHaveLength(15);
            break;
          case "3":
            expect(paymentNoticeNumber.checkDigit).toHaveLength(2);
            expect(paymentNoticeNumber.segregationCode).toHaveLength(2);
            expect(paymentNoticeNumber.iuv13).toHaveLength(13);
            break;
        }
      }
      expect(PaymentNoticeNumber.is(validation.value)).toBeTruthy();
      const encoded = PaymentNoticeNumber.decode(validation.value)
        .map(PaymentNoticeNumberFromString.encode)
        .getOrElse("");
      expect(encoded).toEqual(aValidPaymentNoticeNumber);
    });
  });

  it("should fail with invalid PaymentNoticeNumberFromString", () => {
    const someInvalidPaymentNoticeNumber: ReadonlyArray<string> = [
      "444012345678901200", // invalid auxDigit
      "14401234567890120", // invalid length
      "24401234567890120X" // invalid char (digit)
    ];
    someInvalidPaymentNoticeNumber.map(aValidPaymentNoticeNumber => {
      const validation = PaymentNoticeNumberFromString.decode(
        aValidPaymentNoticeNumber
      );
      expect(isRight(validation)).toBeFalsy();
      expect(PaymentNoticeNumber.is(validation.value)).toBeFalsy();
    });
  });

  it("should encode a valid PaymentNoticeNumberFromString0", () => {
    const aValidPaymentNoticeNumber: PaymentNoticeNumber0 = {
      applicationCode: "11" as ApplicationCode,
      auxDigit: "0",
      checkDigit: "22" as CheckDigit,
      iuv13: "0123456789012" as IUV13
    };
    const paymentNoticeString = PaymentNoticeNumberFromString.encode(
      aValidPaymentNoticeNumber
    );
    expect(paymentNoticeString).toEqual("011012345678901222");
  });

  it("should encode a valid PaymentNoticeNumberFromString1", async () => {
    const aValidPaymentNoticeNumber: PaymentNoticeNumber1 = {
      auxDigit: "1",
      iuv17: "01234567890123456" as IUV17
    };
    const paymentNoticeString = PaymentNoticeNumberFromString.encode(
      aValidPaymentNoticeNumber
    );
    expect(paymentNoticeString).toEqual("101234567890123456");
  });

  it("should encode a valid PaymentNoticeNumberFromString2", async () => {
    const aValidPaymentNoticeNumber: PaymentNoticeNumber2 = {
      auxDigit: "2",
      checkDigit: "22" as CheckDigit,
      iuv15: "012345678901234" as IUV15
    };
    const paymentNoticeString = PaymentNoticeNumberFromString.encode(
      aValidPaymentNoticeNumber
    );
    expect(paymentNoticeString).toEqual("201234567890123422");
  });

  it("should encode a valid PaymentNoticeNumberFromString3", async () => {
    const aValidPaymentNoticeNumber: PaymentNoticeNumber3 = {
      auxDigit: "3",
      checkDigit: "33" as CheckDigit,
      iuv13: "0123456789012" as IUV13,
      segregationCode: "44" as SegregationCode
    };
    const paymentNoticeString = PaymentNoticeNumberFromString.encode(
      aValidPaymentNoticeNumber
    );
    expect(paymentNoticeString).toEqual("344012345678901233");
  });
});

describe("QrCodeFromString", () => {
  it.each([
    [
      "PAGOPA|002|123456789012345678|12345678901|1234567801",
      "23456789012345678",
      10,
      "1",
      1234567801,
      "should succeed with valid QrCode"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|11",
      "0320027000002",
      2,
      "3",
      11,
      "should succeed with valid QrCode of two digits amount"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|01",
      "0320027000002",
      2,
      "3",
      1,
      "should succeed with valid QrCode of one cent"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|2",
      "0320027000002",
      1,
      "3",
      2,
      "should succeed with valid QrCode of two cent"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|001",
      "0320027000002",
      3,
      "3",
      1,
      "should succeed with valid QrCode of tree digits amount"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|0001",
      "0320027000002",
      4,
      "3",
      1,
      "should succeed with valid QrCode of four digits amount"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|999",
      "0320027000002",
      3,
      "3",
      999,
      "should succeed with valid QrCode of tree digits amount"
    ],
    [
      "PAGOPA|002|302032002700000251|03334231200|1000",
      "0320027000002",
      4,
      "3",
      1000,
      "should succeed with valid QrCode of four digits amount"
    ],
    [
      "PAGOPA|002|223456789012345678|12345678901|1234567801",
      "234567890123456",
      10,
      "2",
      1234567801,
      "should succeed with valid QrCode for auxDigit equals 2"
    ]
  ])(
    "%s, %s, %s, %s, %d",
    (
      qrCodeSrt,
      paymentNoticeNumber,
      expectedAmountLength,
      expectedAuxDigit,
      amountInCents
    ) => {
      const validation = PaymentNoticeQrCodeFromString.decode(qrCodeSrt);
      expect(isRight(validation)).toBeTruthy();
      if (isRight(validation)) {
        expect(validation.value.amount).toHaveLength(expectedAmountLength);
        expect(parseInt(validation.value.amount, 10)).toEqual(amountInCents);
        expect(validation.value.identifier).toHaveLength(6);
        expect(validation.value.version).toHaveLength(3);
        expect(validation.value.organizationFiscalCode).toHaveLength(11);
        expect(validation.value.paymentNoticeNumber.auxDigit).toEqual(
          expectedAuxDigit
        );

        switch (expectedAuxDigit) {
          case "0":
            expect(
              (validation.value.paymentNoticeNumber as PaymentNoticeNumber0)
                .iuv13
            ).toEqual(paymentNoticeNumber);
            break;
          case "1":
            expect(
              (validation.value.paymentNoticeNumber as PaymentNoticeNumber1)
                .iuv17
            ).toEqual(paymentNoticeNumber);
            break;
          case "2":
            expect(
              (validation.value.paymentNoticeNumber as PaymentNoticeNumber2)
                .iuv15
            ).toEqual(paymentNoticeNumber);
            break;
          case "3":
            expect(
              (validation.value.paymentNoticeNumber as PaymentNoticeNumber3)
                .iuv13
            ).toEqual(paymentNoticeNumber);
            break;
          default:
            expect(false).toBeTruthy();
        }

        expect(PaymentNoticeQrCodeFromString.encode(validation.value)).toEqual(
          qrCodeSrt
        );
      }
    }
  );

  it("should fail with invalid QrCode", () => {
    const qrCodeSrts: ReadonlyArray<string> = [
      "XAGOPA|002|123456789012345678|12345678901|1234567801", // invalid identifier
      "PAGOPA|003|123456789012345678|12345678901|1234567801", // invalid version
      "PAGOPA|002|123456789012345678|12345678901|123456780X", // invalid amount
      "PAGOPA|002|12345678901234567X|12345678901|1567800", // invalid paymentNumber
      "PAGOPA|002|123456789012345675|X2345678901|567800" // invalid fiscal code
    ];
    qrCodeSrts.map(qrCodeSrt => {
      const validation = PaymentNoticeQrCodeFromString.decode(qrCodeSrt);
      expect(isRight(validation)).toBeFalsy();
    });
  });
});

describe("RptIdFromString", () => {
  it("should succeed with valid RptId", () => {
    const rptIdStr = "12345678901123456789012345678";
    const validation = RptIdFromString.decode(rptIdStr);
    expect(isRight(validation)).toBeTruthy();
    if (isRight(validation)) {
      expect(validation.value.organizationFiscalCode).toHaveLength(11);
      expect(validation.value.paymentNoticeNumber.auxDigit).toEqual("1");
      // tslint:disable-next-line:no-any
      expect((validation.value.paymentNoticeNumber as any).iuv17).toEqual(
        "23456789012345678"
      );
      expect(RptIdFromString.encode(validation.value)).toEqual(rptIdStr);
    }
  });

  it("should fail with invalid RptId", () => {
    const rptIdStrs: ReadonlyArray<string> = [
      "1234567890112345678901234567X", // invalid paymentNumber
      "X2345678901123456789012345675" // invalid fiscal code
    ];
    rptIdStrs.map(rptIdStr => {
      const validation = RptIdFromString.decode(rptIdStr);
      expect(isRight(validation)).toBeFalsy();
    });
  });
});

describe("rptIdFromPaymentNoticeQrCode", () => {
  it("should convert a valid PaymentNoticeQrcode to an RptId", () => {
    const qrCodes: ReadonlyArray<PaymentNoticeQrCode> = [
      {
        identifier: "PAGOPA",
        version: "002",
        paymentNoticeNumber: {
          auxDigit: "1",
          iuv17: "01234567890123456" as IUV17
        } as PaymentNoticeNumber,
        organizationFiscalCode: "12345678901" as OrganizationFiscalCode,
        amount: "12345" as AmountInEuroCents
      },
      {
        identifier: "PAGOPA",
        version: "002",
        paymentNoticeNumber: {
          auxDigit: "2",
          checkDigit: "22" as CheckDigit,
          iuv15: "012345678901234" as IUV15
        } as PaymentNoticeNumber,
        organizationFiscalCode: "12345678901" as OrganizationFiscalCode,
        amount: "12345" as AmountInEuroCents
      },
      {
        identifier: "PAGOPA",
        version: "002",
        paymentNoticeNumber: {
          auxDigit: "3",
          checkDigit: "33" as CheckDigit,
          iuv13: "0123456789012" as IUV13,
          segregationCode: "44" as SegregationCode
        } as PaymentNoticeNumber,
        organizationFiscalCode: "12345678901" as OrganizationFiscalCode,
        amount: "12345" as AmountInEuroCents
      }
    ];
    qrCodes.forEach(qrCode =>
      expect(rptIdFromPaymentNoticeQrCode(qrCode).isRight()).toBeTruthy()
    );
  });

  it("should NOT convert an invalid PaymentNoticeQrcode into an RptId", () => {
    // tslint:disable-next-line: no-any
    const qrCodes: ReadonlyArray<any> = [
      {
        identifier: "PAGOPA",
        version: "002",
        paymentNoticeNumber: {
          // invalid PaymentNoticeNumber (aux digit)
          auxDigit: "5",
          iuv17: "01234567890123456" as IUV17
        },
        organizationFiscalCode: "12345678901",
        amount: "12345" as AmountInEuroCents
      },
      {
        identifier: "PAGOPA",
        version: "002",
        paymentNoticeNumber: {
          auxDigit: "1",
          iuv17: "01234567890123456" as IUV17
        } as PaymentNoticeNumber,
        organizationFiscalCode: "12345*78901", // invalid fiscal code
        amount: "12345" as AmountInEuroCents
      }
    ];
    qrCodes.forEach(qrCode =>
      expect(rptIdFromPaymentNoticeQrCode(qrCode).isLeft()).toBeTruthy()
    );
  });
});

describe("rptIdFromQrCodeString", () => {
  it("should convert valid QR code strings into RptIds", () => {
    const qrCodes = [
      "PAGOPA|002|101234567890123456|12345678901|1",
      "PAGOPA|002|101234567890123456|12345678901|12345",
      "PAGOPA|002|201234567890123422|12345678901|12345",
      "PAGOPA|002|301234567890123344|12345678901|0000012345"
    ];
    qrCodes.forEach(qrCode =>
      expect(rptIdFromQrCodeString(qrCode).isRight()).toBeTruthy()
    );
  });

  it("should NOT convert invalid QR code strings into RptIds", () => {
    const qrCodes = [
      "PAGOPA|002|501234567890123456|12345678901|12345", // invalid aux digit (5)
      "PAGOPA|002|101234567890123456|12345*78901|12345" // invalid fiscal code
    ];
    qrCodes.forEach(qrCode =>
      expect(rptIdFromQrCodeString(qrCode).isRight()).toBeFalsy()
    );
  });
});

describe("AmountInEuroCentsFromNumber", () => {
  it("should convert numbers into AmountInEuroCents", () => {
    const expectedMapping = new StrMap({
      "1234567890": 12345678.9,
      "12345": 123.45,
      "100": 1,
      "30": 0.3,
      "01": 0.01,
      "12": 0.1 + 0.02 // 0.12000000000000001 but should be considered as .12
    });

    toArray(expectedMapping).forEach(([k, v]: [string, number]) =>
      expect(AmountInEuroCentsFromNumber.decode(v).value).toBe(k)
    );
  });
});
