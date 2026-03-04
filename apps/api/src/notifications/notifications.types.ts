export type NotificationJobData =
  | {
      type: 'milestone.completed';
      milestoneId: string;
      milestoneName: string;
      projectId: string;
      clientId: string;
    }
  | {
      type: 'milestone.signed_off';
      milestoneId: string;
      milestoneName: string;
      projectId: string;
      projectName: string;
      signedOffByName: string;
    }
  | {
      type: 'comment.created';
      commentId: string;
      authorId: string;
      authorName: string;
      bodyPreview: string;
      targetType: string;
      targetId: string;
      targetLabel: string;
      /** clientId of the org the target belongs to */
      targetClientId: string;
      /** true = author is a SiteHaus employee */
      isEmployeeAuthor: boolean;
    }
  | {
      type: 'billing.payment_failed';
      billingRecordId: string;
      clientId: string;
      amountCents: number;
    };
