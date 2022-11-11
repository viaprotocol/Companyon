import { Button, DrawerProps, Form, Input, message, Modal } from 'antd';
import clsx from 'clsx';
import { CHAINS, INITIAL_OPENAPI_URL } from 'consts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import ReactGA from 'react-ga';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconActivities from 'ui/assets/dashboard/activities.svg';
import IconLock from 'ui/assets/lock.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
import IconReset from 'ui/assets/reset-account.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconServer from 'ui/assets/server.svg';
import { Field, PageHeader, Popup } from 'ui/component';
import { openInTab, useWallet, useWalletOld } from 'ui/utils';
import './style.less';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import IconContacts from 'ui/assets/swap/contact.svg';
import IconSettingWidget from 'ui/assets/settings-widget.svg';
import IconDiscord from 'ui/assets/discord.svg';
import { Contacts, Widget } from '..';
import stats from '@/stats';
import { useAsync, useCss } from 'react-use';
import compareVersions from 'compare-versions';

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const { confirm } = Modal;

const OpenApiModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const { useForm } = Form;
  const [isVisible, setIsVisible] = useState(false);
  const [form] = useForm<{ host: string }>();
  const { t } = useTranslation();

  const host = useRabbySelector((state) => state.openapi.host);
  const dispatch = useRabbyDispatch();

  const handleSubmit = async ({ host }: { host: string }) => {
    await dispatch.openapi.setHost(host);
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: INITIAL_OPENAPI_URL,
    });
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  useEffect(() => {
    form.setFieldsValue({
      host,
    });
  }, [form, host]);

  useEffect(() => {
    dispatch.openapi.getHost();
  }, [dispatch]);

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('openapi-modal', { show: isVisible, hidden: !visible })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Backend Service URL')}
      </PageHeader>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            { required: true, message: t('Please input openapi host') },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+\.[^\s]+/,
              message: t('Please check your host'),
            },
          ]}
        >
          <Input
            className="popup-input"
            placeholder="Host"
            size="large"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
        {form.getFieldValue('host') !== INITIAL_OPENAPI_URL && (
          <div className="flex justify-end">
            <Button type="link" onClick={restoreInitial} className="restore">
              {t('Restore initial setting')}
            </Button>
          </div>
        )}
        <div className="flex justify-center mt-24 popup-footer">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className="w-[200px]"
          >
            {t('Save')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

const ResetAccountModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const wallet = useWalletOld();
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleResetAccount = async () => {
    const currentAddress = (await wallet.getCurrentAccount()).address;
    await wallet.clearAddressPendingTransactions(currentAddress);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Reset success'),
      duration: 0.5,
    });
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('reset-account-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Reset Account')}
      </PageHeader>
      <div>
        <p className="reset-account-content mb-16">
          {t('ResetAccountDescription1')}
        </p>
        <p className="reset-account-content">{t('ResetAccountDescription2')}</p>
        <p className="reset-account-warn">{t('ResetAccountWarn')}</p>
        <div className="flex justify-center mt-24 popup-footer">
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={handleResetAccount}
          >
            {t('Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ visible, onClose }: SettingsProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [showResetAccountModal, setShowResetAccountModal] = useState(false);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(false);

  const handleClickClearWatchMode = () => {
    confirm({
      title: 'Warning',
      content: 'Do you make sure to delete all Watch Mode address?',
      onOk() {
        wallet.clearWatchMode();
      },
    });
  };

  const { value: hasNewVersion = false, error } = useAsync(async () => {
    const data = await wallet.openapi.getLatestVersion();

    return (
      compareVersions(process.env.release || '0.0.0', data.version_tag) === -1
    );
  });

  const updateVersionClassName = useCss({
    '& .ant-modal-content': {
      background: '#fff',
    },
    '& .ant-modal-body': {
      padding: '15px 14px 28px 14px',
    },
    '& .ant-modal-confirm-content': {
      padding: '24px 0 0 0',
    },
    '& .ant-modal-confirm-btns': {
      justifyContent: 'center',
      'button:first-child': {
        display: 'none',
      },
    },
  });

  const updateVersion = () => {
    if (hasNewVersion) {
      confirm({
        width: 320,
        closable: true,
        centered: true,
        className: updateVersionClassName,
        title: null,
        content: (
          <div className="text-14 leading-[18px] text-center text-gray-subTitle">
            A new update for Rabby Wallet is available. Click to check how to
            update manually.
          </div>
        ),
        okText: 'See Tutorial',
        onOk() {
          openInTab('https://rabby.io/update-extension');
        },
      });
    } else {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: (
          <span className="text-white">You are using the latest version</span>
        ),
      });
    }
  };

  const renderData = [
    {
      leftIcon: IconActivities,
      content: t('Signature Record'),
      onClick: () => {
        history.push('/activities');
        reportSettings('activities');
      },
    },
    {
      leftIcon: IconContacts,
      content: t('Contacts'),
      onClick: () => {
        setContactsVisible(true);
        reportSettings('contract');
      },
    },
    {
      leftIcon: IconSettingWidget,
      content: t('Widget'),
      onClick: () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        onClose?.();
        setWidgetVisible(true);
        reportSettings('widget');
      },
    },

    {
      leftIcon: IconReset,
      content: t('Reset Account'),
      onClick: () => {
        ReactGA.event({
          category: 'Setting',
          action: 'clickToUse',
          label: 'resetAccount',
        });
        setShowResetAccountModal(true);
        reportSettings('resetAccount');
      },
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    },
    {
      leftIcon: IconDiscord,
      content: t('Contact us on Discord'),
      onClick: () => {
        reportSettings('discord');
        window.open('https://discord.com/invite/seFBCWmUre');
      },
    },
  ];

  if (process.env.DEBUG) {
    renderData.splice(-1, 0, {
      leftIcon: IconServer,
      content: t('Backend Service URL'),
      onClick: () => setShowOpenApiModal(true),
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    } as typeof renderData[0]);
  }

  if (process.env.DEBUG) {
    renderData.push({
      content: t('Clear Watch Mode'),
      onClick: handleClickClearWatchMode,
    } as typeof renderData[0]);
  }

  const lockWallet = async () => {
    ReactGA.event({
      category: 'Setting',
      action: 'clickToUse',
      label: 'lockWallet',
    });
    reportSettings('lockWallet');
    await wallet.lockWallet();
    history.push('/unlock');
  };

  const handleClose: DrawerProps['onClose'] = (e) => {
    setShowOpenApiModal(false);
    setShowResetAccountModal(false);
    onClose && onClose(e);
  };

  return (
    <>
      <Popup
        visible={visible}
        onClose={handleClose}
        height={520}
        bodyStyle={{ height: '100%' }}
      >
        <div className="popup-settings">
          <div className="content">
            <Button
              block
              size="large"
              type="primary"
              className="flex justify-center items-center lock-wallet"
              onClick={lockWallet}
            >
              <img src={IconLock} className="icon icon-lock" />{' '}
              {t('Lock Wallet')}
            </Button>
            {renderData.map((data, index) => (
              <Field
                key={index}
                leftIcon={<img src={data.leftIcon} className="icon" />}
                rightIcon={
                  data.rightIcon || (
                    <img
                      src={IconArrowRight}
                      className="icon icon-arrow-right"
                    />
                  )
                }
                onClick={data.onClick}
              >
                {data.content}
              </Field>
            ))}
          </div>
          <footer className="footer">
            <img src={LogoRabby} alt="" />
            <div>
              <span
                className="text-12 underline text-gray-content cursor-pointer"
                role="button"
                onClick={updateVersion}
              >
                {process.env.version}
              </span>
              <span
                className={clsx(
                  'px-[6px] py-[1px] mx-[4px] rounded-[90px] bg-[#ec5151] text-white text-center',
                  !hasNewVersion && 'hidden'
                )}
                role="button"
                onClick={updateVersion}
              >
                Update Available
              </span>
              /{' '}
              <Link to="/settings/chain-list" className="underline">
                {Object.values(CHAINS).length} chains supported
              </Link>
            </div>
          </footer>
          <Contacts
            visible={contactsVisible}
            onClose={(e) => {
              setContactsVisible(false);
              onClose?.(e);
            }}
          />

          <OpenApiModal
            visible={showOpenApiModal}
            onFinish={() => setShowOpenApiModal(false)}
            onCancel={() => setShowOpenApiModal(false)}
          />
          <ResetAccountModal
            visible={showResetAccountModal}
            onFinish={() => setShowResetAccountModal(false)}
            onCancel={() => setShowResetAccountModal(false)}
          />
        </div>
      </Popup>

      <Widget
        visible={widgetVisible}
        onClose={() => {
          setWidgetVisible(false);
        }}
      />
    </>
  );
};

function reportSettings(moduleName: string) {
  stats.report('settingsModule', {
    moduleName,
  });
}

export default Settings;
